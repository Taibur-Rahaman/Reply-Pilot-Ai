import { newId, toIso } from "./ids";
import { prisma } from "./prisma";
import { appendTimelineEvent } from "./timeline";
import type {
  Channel,
  Complaint,
  ComplaintPriority,
  ComplaintResolution,
  ComplaintStatus,
} from "./types";

function mapComplaint(c: {
  id: string;
  tenantId: string;
  conversationId: string | null;
  leadId: string | null;
  senderId: string | null;
  channel: string | null;
  text: string;
  priority: string;
  status: string;
  resolution: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}): Complaint {
  return {
    id: c.id,
    tenantId: c.tenantId,
    conversationId: c.conversationId || undefined,
    leadId: c.leadId || undefined,
    senderId: c.senderId || undefined,
    channel: (c.channel as Channel) || undefined,
    text: c.text,
    priority: c.priority as ComplaintPriority,
    status: c.status as ComplaintStatus,
    resolution: c.resolution as ComplaintResolution,
    notes: c.notes || undefined,
    createdAt: toIso(c.createdAt),
    updatedAt: toIso(c.updatedAt),
  };
}

export async function createComplaint(input: {
  tenantId: string;
  text: string;
  priority: ComplaintPriority;
  conversationId?: string;
  leadId?: string;
  senderId?: string;
  channel?: Channel;
  notes?: string;
}): Promise<Complaint> {
  const now = new Date();
  const complaint = await prisma.complaint.create({
    data: {
      id: newId("cmp"),
      tenantId: input.tenantId,
      conversationId: input.conversationId,
      leadId: input.leadId,
      senderId: input.senderId,
      channel: input.channel,
      text: input.text.slice(0, 1000),
      priority: input.priority,
      status: "open",
      resolution: "none",
      notes: input.notes,
      createdAt: now,
      updatedAt: now,
    },
  });
  if (input.conversationId) {
    await prisma.conversation.updateMany({
      where: { id: input.conversationId, tenantId: input.tenantId },
      data: { complaintTagged: true, priority: input.priority },
    });
  }
  await appendTimelineEvent({
    tenantId: input.tenantId,
    senderId: input.senderId,
    type: "complaint",
    title: `Complaint (${input.priority})`,
    body: input.text.slice(0, 300),
    refId: complaint.id,
  }).catch(() => undefined);
  return mapComplaint(complaint);
}

export async function listComplaints(tenantId: string): Promise<Complaint[]> {
  const rows = await prisma.complaint.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(mapComplaint);
}

export async function updateComplaint(
  tenantId: string,
  id: string,
  patch: Partial<
    Pick<Complaint, "status" | "priority" | "resolution" | "notes">
  >,
): Promise<Complaint | null> {
  const existing = await prisma.complaint.findFirst({
    where: { id, tenantId },
  });
  if (!existing) return null;
  const c = await prisma.complaint.update({
    where: { id },
    data: {
      ...(patch.status ? { status: patch.status } : {}),
      ...(patch.priority ? { priority: patch.priority } : {}),
      ...(patch.resolution ? { resolution: patch.resolution } : {}),
      ...(typeof patch.notes === "string" ? { notes: patch.notes } : {}),
    },
  });
  return mapComplaint(c);
}

export async function escalateComplaint(
  tenantId: string,
  id: string,
): Promise<Complaint | null> {
  const existing = await prisma.complaint.findFirst({
    where: { id, tenantId },
  });
  if (!existing) return null;
  const c = await prisma.complaint.update({
    where: { id },
    data: { status: "escalated" },
  });
  if (c.senderId) {
    await prisma.conversation.updateMany({
      where: { tenantId, senderId: c.senderId },
      data: {
        handoffActive: true,
        complaintTagged: true,
        priority: c.priority,
      },
    });
  }
  return mapComplaint(c);
}
