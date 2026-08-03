import { newId, toIso } from "./ids";
import { prisma } from "./prisma";
import { appendTimelineEvent } from "./timeline";
import { writeAuditLog } from "./audit";
import type {
  Channel,
  Conversation,
  Message,
  ProductRecognitionMeta,
} from "./types";

function mapConvo(c: {
  id: string;
  tenantId: string;
  pageId: string;
  senderId: string;
  senderName: string | null;
  channel: string;
  handoffActive: boolean;
  assignedUserId: string | null;
  priority: string | null;
  complaintTagged: boolean;
  lastMessageAt: Date;
  createdAt: Date;
}): Conversation {
  return {
    id: c.id,
    tenantId: c.tenantId,
    pageId: c.pageId,
    senderId: c.senderId,
    senderName: c.senderName || undefined,
    channel: (c.channel || "messenger") as Channel,
    handoffActive: c.handoffActive,
    assignedUserId: c.assignedUserId || undefined,
    priority: (c.priority as Conversation["priority"]) || undefined,
    complaintTagged: c.complaintTagged || undefined,
    lastMessageAt: toIso(c.lastMessageAt),
    createdAt: toIso(c.createdAt),
  };
}

function mapMessage(m: {
  id: string;
  tenantId: string;
  conversationId: string;
  direction: string;
  text: string;
  mid: string | null;
  imageUrl: string | null;
  recognition: unknown;
  createdAt: Date;
}): Message {
  return {
    id: m.id,
    tenantId: m.tenantId,
    conversationId: m.conversationId,
    direction: m.direction as Message["direction"],
    text: m.text,
    mid: m.mid || undefined,
    imageUrl: m.imageUrl || undefined,
    recognition: (m.recognition as ProductRecognitionMeta) || undefined,
    createdAt: toIso(m.createdAt),
  };
}

export async function upsertConversation(input: {
  tenantId: string;
  pageId: string;
  senderId: string;
  senderName?: string;
  channel?: Channel;
}): Promise<Conversation> {
  const channel = input.channel || "messenger";
  const now = new Date();
  const existing = await prisma.conversation.findUnique({
    where: {
      tenantId_pageId_senderId_channel: {
        tenantId: input.tenantId,
        pageId: input.pageId,
        senderId: input.senderId,
        channel,
      },
    },
  });
  if (existing) {
    const updated = await prisma.conversation.update({
      where: { id: existing.id },
      data: {
        lastMessageAt: now,
        ...(input.senderName ? { senderName: input.senderName } : {}),
      },
    });
    return mapConvo(updated);
  }
  const created = await prisma.conversation.create({
    data: {
      id: newId("conv"),
      tenantId: input.tenantId,
      pageId: input.pageId,
      senderId: input.senderId,
      senderName: input.senderName,
      channel,
      handoffActive: false,
      lastMessageAt: now,
      createdAt: now,
    },
  });
  return mapConvo(created);
}

export async function appendMessage(input: {
  tenantId: string;
  conversationId: string;
  direction: Message["direction"];
  text: string;
  mid?: string;
  imageUrl?: string;
  recognition?: ProductRecognitionMeta;
}): Promise<Message> {
  const now = new Date();
  const message = await prisma.message.create({
    data: {
      id: newId("msg"),
      tenantId: input.tenantId,
      conversationId: input.conversationId,
      direction: input.direction,
      text: input.text,
      mid: input.mid,
      imageUrl: input.imageUrl,
      recognition: input.recognition ?? undefined,
      createdAt: now,
    },
  });
  const convo = await prisma.conversation.update({
    where: { id: input.conversationId },
    data: { lastMessageAt: now },
  });
  if (input.direction === "inbound" || input.direction === "outbound") {
    await appendTimelineEvent({
      tenantId: input.tenantId,
      senderId: convo.senderId,
      type: "message",
      title: input.direction === "inbound" ? "Customer message" : "Reply",
      body: input.text.slice(0, 300),
      refId: message.id,
    }).catch(() => undefined);
  }
  return mapMessage(message);
}

export async function listConversations(
  tenantId: string,
  channel?: Channel | "all",
): Promise<(Conversation & { preview?: string })[]> {
  const rows = await prisma.conversation.findMany({
    where: {
      tenantId,
      ...(channel && channel !== "all" ? { channel } : {}),
    },
    orderBy: { lastMessageAt: "desc" },
  });
  const result: (Conversation & { preview?: string })[] = [];
  for (const c of rows) {
    const last = await prisma.message.findFirst({
      where: { conversationId: c.id },
      orderBy: { createdAt: "desc" },
    });
    result.push({
      ...mapConvo(c),
      preview: last?.text?.slice(0, 120),
    });
  }
  return result;
}

export async function listMessages(
  tenantId: string,
  conversationId: string,
): Promise<Message[]> {
  const rows = await prisma.message.findMany({
    where: { tenantId, conversationId },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(mapMessage);
}

export async function getConversation(
  tenantId: string,
  conversationId: string,
): Promise<Conversation | null> {
  const row = await prisma.conversation.findFirst({
    where: { id: conversationId, tenantId },
  });
  return row ? mapConvo(row) : null;
}

export async function setConversationHandoff(
  tenantId: string,
  senderId: string,
  active: boolean,
  opts?: { assignedUserId?: string | null; actorId?: string; actorEmail?: string },
): Promise<void> {
  await prisma.conversation.updateMany({
    where: { tenantId, senderId },
    data: {
      handoffActive: active,
      ...(opts?.assignedUserId !== undefined
        ? { assignedUserId: opts.assignedUserId }
        : active
          ? {}
          : { assignedUserId: null }),
    },
  });
  await appendTimelineEvent({
    tenantId,
    senderId,
    type: "handoff",
    title: active ? "Human takeover" : "AI resumed",
    body: opts?.assignedUserId
      ? `Assigned to ${opts.assignedUserId}`
      : undefined,
  }).catch(() => undefined);
  await writeAuditLog({
    tenantId,
    actorId: opts?.actorId,
    actorEmail: opts?.actorEmail,
    action: active ? "handoff.take" : "handoff.leave",
    entityType: "conversation",
    entityId: senderId,
  }).catch(() => undefined);
}

export async function setConversationHandoffById(
  tenantId: string,
  conversationId: string,
  active: boolean,
  opts?: {
    assignedUserId?: string | null;
    actorId?: string;
    actorEmail?: string;
    note?: string;
  },
): Promise<Conversation | null> {
  const existing = await prisma.conversation.findFirst({
    where: { id: conversationId, tenantId },
  });
  if (!existing) return null;
  const updated = await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      handoffActive: active,
      assignedUserId: active
        ? opts?.assignedUserId ?? existing.assignedUserId
        : null,
    },
  });
  if (opts?.note?.trim()) {
    await appendTimelineEvent({
      tenantId,
      senderId: updated.senderId,
      type: "note",
      title: "Agent note",
      body: opts.note.trim(),
      refId: conversationId,
    });
  }
  await appendTimelineEvent({
    tenantId,
    senderId: updated.senderId,
    type: "handoff",
    title: active ? "Human takeover" : "AI resumed",
  }).catch(() => undefined);
  await writeAuditLog({
    tenantId,
    actorId: opts?.actorId,
    actorEmail: opts?.actorEmail,
    action: active ? "handoff.take" : "handoff.leave",
    entityType: "conversation",
    entityId: conversationId,
    meta: opts?.note ? { note: opts.note } : undefined,
  }).catch(() => undefined);
  return mapConvo(updated);
}

export async function addConversationNote(
  tenantId: string,
  conversationId: string,
  note: string,
  actor?: { userId?: string; email?: string },
): Promise<void> {
  const convo = await prisma.conversation.findFirst({
    where: { id: conversationId, tenantId },
  });
  if (!convo) return;
  await appendTimelineEvent({
    tenantId,
    senderId: convo.senderId,
    type: "note",
    title: "Agent note",
    body: note.trim(),
    refId: conversationId,
  });
  await writeAuditLog({
    tenantId,
    actorId: actor?.userId,
    actorEmail: actor?.email,
    action: "handoff.note",
    entityType: "conversation",
    entityId: conversationId,
  }).catch(() => undefined);
}

export async function isConversationHandoff(
  tenantId: string,
  senderId: string,
): Promise<boolean> {
  const c = await prisma.conversation.findFirst({
    where: { tenantId, senderId },
  });
  return Boolean(c?.handoffActive);
}

export async function ingestChannelMessage(input: {
  tenantId: string;
  channel: Channel;
  senderId: string;
  senderName?: string;
  text: string;
  pageId?: string;
}): Promise<{ conversation: Conversation; message: Message }> {
  const convo = await upsertConversation({
    tenantId: input.tenantId,
    pageId: input.pageId || `channel_${input.channel}`,
    senderId: input.senderId,
    senderName: input.senderName,
    channel: input.channel,
  });
  const message = await appendMessage({
    tenantId: input.tenantId,
    conversationId: convo.id,
    direction: "inbound",
    text: input.text,
  });
  return { conversation: convo, message };
}
