/** Re-export tenant-aware leads API (legacy path). */
export {
  validateLead,
  storeLead,
  listLeads,
  updateLeadStage,
  queueLeadFollowUp,
  markLeadFollowUpSent,
  listAbandonedLeads,
  type LeadPayload,
} from "@/lib/db/leads";
export type { Lead as StoredLead } from "@/lib/db/types";
