import { newId, toIso } from "./ids";
import { prisma } from "./prisma";
import { DEFAULT_TENANT_ID, type CrmStage, type Lead } from "./types";
import type { InterestValue } from "@/lib/config";
import { appendTimelineEvent } from "./timeline";

export type LeadPayload = {
  name: string;
  phone: string;
  businessType: string;
  interest: InterestValue | string;
  source?: string;
  tenantId?: string;
  senderId?: string;
  notes?: string;
};

function normalizePhone(phone: string) {
  return phone.replace(/[^\d+]/g, "").trim();
}

function mapLead(l: {
  id: string;
  tenantId: string;
  name: string;
  phone: string;
  businessType: string;
  interest: string;
  source: string;
  crmStage: string;
  notes: string | null;
  senderId: string | null;
  followUpQueuedAt: Date | null;
  followUpSentAt: Date | null;
  priority: string | null;
  createdAt: Date;
  updatedAt: Date;
}): Lead {
  return {
    id: l.id,
    tenantId: l.tenantId,
    name: l.name,
    phone: l.phone,
    businessType: l.businessType,
    interest: l.interest,
    source: l.source,
    crmStage: l.crmStage as CrmStage,
    notes: l.notes || undefined,
    senderId: l.senderId || undefined,
    followUpQueuedAt: l.followUpQueuedAt
      ? toIso(l.followUpQueuedAt)
      : undefined,
    followUpSentAt: l.followUpSentAt ? toIso(l.followUpSentAt) : undefined,
    priority: (l.priority as Lead["priority"]) || undefined,
    createdAt: toIso(l.createdAt),
    updatedAt: toIso(l.updatedAt),
  };
}

export function validateLead(input: unknown): {
  ok: true;
  data: LeadPayload;
} | { ok: false; error: string } {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Invalid request body." };
  }

  const body = input as Record<string, unknown>;
  const name = String(body.name ?? "").trim();
  const phone = normalizePhone(String(body.phone ?? ""));
  const businessType = String(body.businessType ?? "").trim();
  const interest = String(body.interest ?? "").trim();
  const source = String(body.source ?? "landing").trim() || "landing";
  const tenantId = String(body.tenantId ?? DEFAULT_TENANT_ID).trim();
  const senderId = String(body.senderId ?? "").trim() || undefined;
  const notes = String(body.notes ?? "").trim() || undefined;

  const allowed = [
    "monthly",
    "chatbot-rule",
    "chatbot-ai",
    "custom-messenger",
    "not-sure",
    "comment-lead",
  ];

  if (name.length < 2) {
    return { ok: false, error: "Please enter your name." };
  }
  if (phone.replace(/\D/g, "").length < 10) {
    return { ok: false, error: "Please enter a valid WhatsApp / phone number." };
  }
  if (businessType.length < 2) {
    return { ok: false, error: "Please tell us your business type." };
  }
  if (!allowed.includes(interest) && source !== "facebook_comment") {
    return { ok: false, error: "Please select a package of interest." };
  }

  return {
    ok: true,
    data: { name, phone, businessType, interest, source, tenantId, senderId, notes },
  };
}

export async function postLeadWebhook(lead: Lead) {
  const url = process.env.LEADS_WEBHOOK_URL?.trim();
  if (!url) return { sent: false as const };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(lead),
  });

  if (!response.ok) {
    throw new Error(`Webhook failed with status ${response.status}`);
  }
  return { sent: true as const };
}

export async function storeLead(payload: LeadPayload): Promise<Lead> {
  const tenantId = payload.tenantId || DEFAULT_TENANT_ID;
  const now = new Date();
  const lead = await prisma.lead.create({
    data: {
      id: newId("lead"),
      tenantId,
      name: payload.name,
      phone: payload.phone,
      businessType: payload.businessType,
      interest: payload.interest,
      source: payload.source || "landing",
      crmStage: "new",
      notes: payload.notes,
      senderId: payload.senderId,
      createdAt: now,
      updatedAt: now,
    },
  });
  const mapped = mapLead(lead);
  await appendTimelineEvent({
    tenantId,
    senderId: payload.senderId,
    leadId: mapped.id,
    type: "lead",
    title: "Lead created",
    body: `${mapped.name} · ${mapped.phone}`,
    refId: mapped.id,
  }).catch(() => undefined);

  try {
    await postLeadWebhook(mapped);
  } catch (error) {
    console.error("[leads] webhook error:", error);
  }

  return mapped;
}

export async function listLeads(tenantId: string): Promise<Lead[]> {
  const rows = await prisma.lead.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(mapLead);
}

export async function updateLeadStage(
  tenantId: string,
  leadId: string,
  crmStage: CrmStage,
): Promise<Lead | null> {
  const existing = await prisma.lead.findFirst({
    where: { id: leadId, tenantId },
  });
  if (!existing) return null;
  const lead = await prisma.lead.update({
    where: { id: leadId },
    data: { crmStage },
  });
  return mapLead(lead);
}

export async function queueLeadFollowUp(
  tenantId: string,
  leadId: string,
): Promise<Lead | null> {
  const existing = await prisma.lead.findFirst({
    where: { id: leadId, tenantId },
  });
  if (!existing) return null;
  const lead = await prisma.lead.update({
    where: { id: leadId },
    data: { followUpQueuedAt: new Date() },
  });
  return mapLead(lead);
}

export async function markLeadFollowUpSent(
  tenantId: string,
  leadId: string,
): Promise<Lead | null> {
  const existing = await prisma.lead.findFirst({
    where: { id: leadId, tenantId },
  });
  if (!existing) return null;
  const lead = await prisma.lead.update({
    where: { id: leadId },
    data: { followUpSentAt: new Date() },
  });
  return mapLead(lead);
}

export async function listAbandonedLeads(
  tenantId: string,
  hours: number,
): Promise<Lead[]> {
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
  const rows = await prisma.lead.findMany({
    where: {
      tenantId,
      followUpSentAt: null,
      crmStage: { in: ["new", "interested"] },
      createdAt: { lt: cutoff },
    },
  });
  return rows.map(mapLead);
}
