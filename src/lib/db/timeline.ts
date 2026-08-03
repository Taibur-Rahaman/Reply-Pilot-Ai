import { newId, toIso } from "./ids";
import { prisma } from "./prisma";
import type { TimelineEvent, TimelineEventType } from "./types";
import type { Prisma } from "@prisma/client";

export async function appendTimelineEvent(input: {
  tenantId: string;
  type: TimelineEventType;
  title: string;
  body?: string;
  senderId?: string;
  leadId?: string;
  refId?: string;
  meta?: Record<string, unknown>;
}): Promise<TimelineEvent> {
  const row = await prisma.timelineEvent.create({
    data: {
      id: newId("tl"),
      tenantId: input.tenantId,
      type: input.type,
      title: input.title,
      body: input.body,
      senderId: input.senderId,
      leadId: input.leadId,
      refId: input.refId,
      meta: (input.meta as Prisma.InputJsonValue) ?? undefined,
    },
  });
  return mapTimeline(row);
}

function mapTimeline(row: {
  id: string;
  tenantId: string;
  senderId: string | null;
  leadId: string | null;
  type: string;
  title: string;
  body: string | null;
  refId: string | null;
  meta: unknown;
  createdAt: Date;
}): TimelineEvent {
  return {
    id: row.id,
    tenantId: row.tenantId,
    senderId: row.senderId || undefined,
    leadId: row.leadId || undefined,
    type: row.type as TimelineEventType,
    title: row.title,
    body: row.body || undefined,
    refId: row.refId || undefined,
    meta: (row.meta as Record<string, unknown>) || undefined,
    createdAt: toIso(row.createdAt),
  };
}

export async function listCustomerTimeline(
  tenantId: string,
  opts: { senderId?: string; leadId?: string; limit?: number },
): Promise<TimelineEvent[]> {
  const where: {
    tenantId: string;
    senderId?: string;
    leadId?: string;
  } = { tenantId };
  if (opts.senderId) where.senderId = opts.senderId;
  if (opts.leadId) where.leadId = opts.leadId;

  const rows = await prisma.timelineEvent.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: opts.limit || 100,
  });
  return rows.map(mapTimeline);
}

/** Build a unified timeline from messages/orders/complaints + notes when sparse. */
export async function getUnifiedCustomerTimeline(
  tenantId: string,
  senderId: string,
): Promise<TimelineEvent[]> {
  const [events, messages, orders, complaints] = await Promise.all([
    listCustomerTimeline(tenantId, { senderId, limit: 50 }),
    prisma.message.findMany({
      where: {
        tenantId,
        conversation: { senderId },
      },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    prisma.order.findMany({
      where: { tenantId, senderId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.complaint.findMany({
      where: { tenantId, senderId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const derived: TimelineEvent[] = [
    ...messages.map((m) => ({
      id: `derived_msg_${m.id}`,
      tenantId,
      senderId,
      type: "message" as const,
      title: m.direction === "inbound" ? "Customer message" : "Agent / AI reply",
      body: m.text.slice(0, 300),
      refId: m.id,
      createdAt: toIso(m.createdAt),
    })),
    ...orders.map((o) => ({
      id: `derived_ord_${o.id}`,
      tenantId,
      senderId,
      type: "order" as const,
      title: `Order ${o.invoiceNumber || o.id.slice(0, 8)}`,
      body: `${o.product} × ${o.qty} — ${o.trackingStatus}`,
      refId: o.id,
      createdAt: toIso(o.createdAt),
    })),
    ...complaints.map((c) => ({
      id: `derived_cmp_${c.id}`,
      tenantId,
      senderId,
      type: "complaint" as const,
      title: `Complaint (${c.priority})`,
      body: c.text.slice(0, 300),
      refId: c.id,
      createdAt: toIso(c.createdAt),
    })),
    ...events,
  ];

  const seen = new Set<string>();
  return derived
    .filter((e) => {
      const key = `${e.type}:${e.refId || e.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
