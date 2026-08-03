import {
  storeLead as dbStoreLead,
  validateLead,
  postLeadWebhook,
  type LeadPayload,
} from "@/lib/db/leads";
import type { Lead } from "@/lib/db/types";

export type { LeadPayload };
export type StoredLead = Lead;

export { validateLead, postLeadWebhook };

/** No-op local jsonl append — durable store is facetai-db.json. */
export async function appendLeadLocally(_lead: StoredLead) {
  // Kept for API compatibility; storeLead writes to tenant DB.
}

export async function storeLead(payload: LeadPayload): Promise<StoredLead> {
  return dbStoreLead(payload);
}
