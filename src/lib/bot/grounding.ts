/**
 * Post-LLM (and pre-LLM) grounding. Prompt instructions are not enough:
 * the Sales Agent must not invent stock, price, discount, tracking, or refunds.
 */

export type GroundingProduct = {
  name: string;
  price: number;
  stock: number;
};

export type GroundingContext = {
  products: GroundingProduct[];
  trackingNumbers: string[];
  knowledge: string;
  userText: string;
};

export type GroundingResult = {
  ok: boolean;
  text: string;
  violations: string[];
  /** 0–1, used for low-confidence escalation. Not a model logprob. */
  confidence: number;
};

const UNGROUNDED_BN =
  "ক্যাটালগ/নলেজ বেসে এই তথ্য নিশ্চিত নেই — দাম, স্টক, ছাড় বা ট্র্যাকিং আমি অনুমান করি না। একজন হিউম্যান এজেন্ট দেখে জানাবে।";

const PRICE_TOKEN_RE = /৳\s*([\d,]+(?:\.\d+)?)|([\d,]+(?:\.\d+)?)\s*(?:tk|taka|টাকা)\b/gi;
const PERCENT_RE = /(\d{1,2})\s*%/g;
const DISCOUNT_CLAIM_RE =
  /(?:৫০%|50\s*%|discount|ছাড়|অফার|flash sale|coupon|কুপন)/i;
const TRACKING_ID_RE =
  /\b(?:TRK|TRACK|AWB|CX|SA|SUNDOR|PATHAO)[-_]?[A-Z0-9]{5,}\b/gi;
const REFUND_DONE_RE =
  /refund(?:ed|\s+has been|\s+processed|\s+issued|\s+done)|রিফান্ড হয়ে|টাকা ফেরত দিয়ে|money (?:has been|was) returned/i;
const PRICE_ASK_RE = /দাম|price|koto|কত(?: টাকা)?|dam\b/i;
const DISCOUNT_ASK_RE = /discount|ছাড়|অফার|%/i;
const TRACKING_ASK_RE = /tracking|ট্র্যাক|awb|কুরিয়ার নম্বর/i;

function catalogPrices(products: GroundingProduct[]): Set<string> {
  const out = new Set<string>();
  for (const p of products) {
    if (!Number.isFinite(p.price)) continue;
    out.add(String(Math.round(p.price)));
    out.add(p.price.toFixed(2).replace(/\.00$/, ""));
  }
  return out;
}

function normalizeAmount(raw: string): string {
  return raw.replace(/,/g, "").replace(/\.0+$/, "");
}

export function catalogProductMentioned(
  userText: string,
  products: GroundingProduct[],
): GroundingProduct | undefined {
  const q = userText.toLowerCase();
  return products.find((p) => {
    const name = p.name.toLowerCase().split("—")[0].trim();
    if (name.length < 3) return false;
    return q.includes(name.slice(0, Math.min(12, name.length)));
  });
}

/** Pre-LLM: factual ask with no catalog/KB support → do not call the model. */
export function ungroundedFactualAsk(ctx: GroundingContext): string | null {
  const kb = ctx.knowledge || "";
  const emptyKb = !kb.trim() || kb.includes("(No knowledge yet.)");
  const hit = catalogProductMentioned(ctx.userText, ctx.products);

  if (PRICE_ASK_RE.test(ctx.userText) && !hit && emptyKb) {
    return UNGROUNDED_BN;
  }
  if (
    DISCOUNT_ASK_RE.test(ctx.userText) &&
    !DISCOUNT_CLAIM_RE.test(kb) &&
    !PERCENT_RE.test(kb)
  ) {
    PERCENT_RE.lastIndex = 0;
    return UNGROUNDED_BN;
  }
  if (TRACKING_ASK_RE.test(ctx.userText) && ctx.trackingNumbers.length === 0) {
    return "এখনো ট্র্যাকিং নম্বর আপডেট নেই — আমি নম্বর বানিয়ে দিতে পারি না। হিউম্যান টিম চেক করে জানাবে।";
  }
  return null;
}

export function validateGroundedReply(
  reply: string,
  ctx: GroundingContext,
): GroundingResult {
  const violations: string[] = [];
  const prices = catalogPrices(ctx.products);
  const kb = ctx.knowledge || "";

  let match: RegExpExecArray | null;
  PRICE_TOKEN_RE.lastIndex = 0;
  while ((match = PRICE_TOKEN_RE.exec(reply)) !== null) {
    const amount = normalizeAmount(match[1] || match[2] || "");
    if (!amount) continue;
    const asInt = String(Math.round(Number(amount)));
    if (!prices.has(amount) && !prices.has(asInt) && !kb.includes(amount)) {
      violations.push("invented_price");
      break;
    }
  }

  PERCENT_RE.lastIndex = 0;
  while ((match = PERCENT_RE.exec(reply)) !== null) {
    const pct = match[0];
    if (!kb.includes(pct) && !ctx.products.some((p) => String(p.price).includes(pct))) {
      violations.push("invented_discount");
      break;
    }
  }
  if (DISCOUNT_CLAIM_RE.test(reply) && !DISCOUNT_CLAIM_RE.test(kb)) {
    if (!violations.includes("invented_discount")) {
      violations.push("invented_discount");
    }
  }

  TRACKING_ID_RE.lastIndex = 0;
  while ((match = TRACKING_ID_RE.exec(reply)) !== null) {
    const id = match[0];
    if (!ctx.trackingNumbers.some((t) => t && t === id)) {
      violations.push("invented_tracking");
      break;
    }
  }

  if (REFUND_DONE_RE.test(reply)) {
    violations.push("invented_refund");
  }

  const hit = catalogProductMentioned(ctx.userText, ctx.products);
  const hasKb = kb.trim() && !kb.includes("(No knowledge yet.)");
  let confidence = 0.82;
  if (violations.length) confidence = 0.35;
  else if (PRICE_ASK_RE.test(ctx.userText) && !hit && !hasKb) confidence = 0.4;
  else if (unrelatedFiller(reply)) confidence = 0.55;

  if (violations.length) {
    return { ok: false, text: UNGROUNDED_BN, violations, confidence };
  }
  return { ok: true, text: reply, violations, confidence };
}

function unrelatedFiller(reply: string): boolean {
  return reply.trim().length < 8;
}
