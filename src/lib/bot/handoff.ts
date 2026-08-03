import {
  isConversationHandoff,
  setConversationHandoff,
  DEFAULT_TENANT_ID,
  type GuardrailRules,
  DEFAULT_GUARDRAIL_RULES,
} from "@/lib/db";

export async function isHandoffActive(
  senderId: string,
  tenantId: string = DEFAULT_TENANT_ID,
): Promise<boolean> {
  return isConversationHandoff(tenantId, senderId);
}

export async function setHandoff(
  senderId: string,
  active: boolean,
  tenantId: string = DEFAULT_TENANT_ID,
  opts?: { assignedUserId?: string | null; actorId?: string; actorEmail?: string },
) {
  await setConversationHandoff(tenantId, senderId, active, opts);
}

export type EscalationReason =
  | "refund"
  | "legal"
  | "angry"
  | "low_confidence"
  | "complaint"
  | "none";

const REFUND_RE =
  /refund|ফেরত|রিফান্ড|টাকা ফেরত|money back|return (my )?money/i;
const LEGAL_RE =
  /lawyer|legal|police|আইন|আদালত|পুলিশ|কোর্ট|sue|lawsuit|ভোক্তা অধিকার/i;
const ANGRY_RE =
  /idiot|scam|fraud|cheat|থাক|বদমাশ|হারামজাদা|গালি|angry|furious|রাগ|খারাপ সার্ভিস|worst|never again/i;

/** Evaluate hard escalation rules from Prompt Builder / AI_GUARDRAILS. */
export function evaluateEscalation(
  text: string,
  opts?: {
    confidence?: number;
    rules?: Partial<GuardrailRules>;
    alreadyComplaint?: boolean;
  },
): { escalate: boolean; reason: EscalationReason } {
  const rules = { ...DEFAULT_GUARDRAIL_RULES, ...opts?.rules };
  const t = text || "";

  if (rules.escalateRefund && REFUND_RE.test(t)) {
    return { escalate: true, reason: "refund" };
  }
  if (rules.escalateLegal && LEGAL_RE.test(t)) {
    return { escalate: true, reason: "legal" };
  }
  if (rules.escalateAngry && ANGRY_RE.test(t)) {
    return { escalate: true, reason: "angry" };
  }
  if (
    rules.escalateLowConfidence &&
    typeof opts?.confidence === "number" &&
    opts.confidence < (rules.confidenceThreshold ?? 0.7)
  ) {
    return { escalate: true, reason: "low_confidence" };
  }
  if (opts?.alreadyComplaint) {
    return { escalate: true, reason: "complaint" };
  }
  return { escalate: false, reason: "none" };
}

export function escalationAck(reason: EscalationReason): string {
  switch (reason) {
    case "refund":
      return "রিফান্ড/ফেরত বিষয়টি আমাদের হিউম্যান টিম হ্যান্ডেল করবে। একটু অপেক্ষা করুন — কেউ শীঘ্রই যোগাযোগ করবে।";
    case "legal":
      return "আইনি বিষয় AI দিয়ে সমাধান করা যায় না। আমাদের টিম এখন হ্যান্ডওভার নিচ্ছে।";
    case "angry":
      return "আপনার অসন্তুষ্টি বুঝতে পারছি। একজন হিউম্যান এজেন্ট এখনই দেখবে — ধন্যবাদ ধৈর্যের জন্য।";
    case "low_confidence":
      return "নিশ্চিত উত্তর দিতে পারছি না — টিম চেক করে জানাবে। WhatsApp: 01810-285559।";
    default:
      return "একজন হিউম্যান এজেন্ট এই কথোপকথন হ্যান্ডেল করবে।";
  }
}

/** Append audit line when a page operator message is detected. */
export async function logOperatorEvent(entry: Record<string, unknown>) {
  const { writeAuditLog } = await import("@/lib/db/audit");
  const tenantId = String(entry.tenantId || DEFAULT_TENANT_ID);
  await writeAuditLog({
    tenantId,
    action: String(entry.type || "operator_event"),
    entityType: "conversation",
    entityId: String(entry.senderId || ""),
    meta: entry,
  }).catch(() => undefined);
}
