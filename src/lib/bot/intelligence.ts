import { WHATSAPP_DISPLAY } from "@/lib/config";
import type { ComplaintPriority, Product } from "@/lib/db/types";

const COMPLAINT_PATTERNS: {
  re: RegExp;
  priority: ComplaintPriority;
}[] = [
  {
    re: /refund|ফেরত|টাকা ফেরত|money back|scam|ঠকানো|চুরি/i,
    priority: "urgent",
  },
  {
    re: /নষ্ট|broken|damaged|খারাপ|defect|faulty|fake|নকল|complaint|কমপ্লেইন|অভিযোগ|angry|রাগ|বদ|খারাপ সার্ভিস|worst/i,
    priority: "high",
  },
  {
    re: /exchange|এক্সচেঞ্জ|বদল|wrong (size|item|color)|ভুল (সাইজ|কালার|প্রোডাক্ট)|late delivery|দেরি/i,
    priority: "medium",
  },
  {
    re: /problem|সমস্যা|issue|help me|সাহায্য|disappointed|হতাশ/i,
    priority: "low",
  },
];

export function detectComplaint(text: string): {
  isComplaint: boolean;
  priority: ComplaintPriority;
  matched?: string;
} {
  const t = text.trim();
  if (!t) return { isComplaint: false, priority: "low" };
  for (const p of COMPLAINT_PATTERNS) {
    const m = t.match(p.re);
    if (m) {
      return {
        isComplaint: true,
        priority: p.priority,
        matched: m[0],
      };
    }
  }
  return { isComplaint: false, priority: "low" };
}

export function complaintAckReply(priority: ComplaintPriority): string {
  const base =
    "দুঃখিত যে সমস্যা হয়েছে — আমরা গুরুত্ব দিয়ে দেখছি। একজন হিউম্যান এজেন্ট শীঘ্রই যোগাযোগ করবে।";
  if (priority === "urgent" || priority === "high") {
    return `${base}\nরিফান্ড/এক্সচেঞ্জ লাগলে লিখুন — অথবা WhatsApp ${WHATSAPP_DISPLAY}।`;
  }
  return `${base}\nবিস্তারিত লিখলে সাহায্য করতে পারি।`;
}

export type RecommendationKind =
  | "related"
  | "upsell"
  | "cross_sell"
  | "bundle"
  | "personalized";

export type Recommendation = {
  kind: RecommendationKind;
  product: Product;
  score: number;
  reason: string;
};

function scoreRelated(base: Product, candidate: Product): number {
  let score = 0;
  if (base.id === candidate.id) return -1;
  if (base.category && base.category === candidate.category) score += 3;
  if (base.color && base.color === candidate.color) score += 1;
  if (candidate.crossSellOf?.includes(base.id)) score += 5;
  if (candidate.upsellOf?.includes(base.id)) score += 4;
  if (candidate.bundleWith?.includes(base.id) || base.bundleWith?.includes(candidate.id))
    score += 4;
  // Prefer similar price band
  const ratio =
    Math.min(base.price, candidate.price) /
    Math.max(base.price, candidate.price || 1);
  score += ratio * 2;
  return score;
}

export function getRecommendations(
  catalog: Product[],
  opts: {
    productId?: string;
    query?: string;
    limit?: number;
  } = {},
): Recommendation[] {
  const active = catalog.filter((p) => p.active && p.stock > 0);
  const limit = opts.limit ?? 5;
  const results: Recommendation[] = [];

  const base = opts.productId
    ? active.find((p) => p.id === opts.productId)
    : undefined;

  if (base) {
    for (const c of active) {
      if (c.id === base.id) continue;
      if (c.upsellOf?.includes(base.id) || base.upsellOf?.includes(c.id)) {
        results.push({
          kind: "upsell",
          product: c,
          score: 10 + (c.price > base.price ? 2 : 0),
          reason: `Upsell for ${base.name}`,
        });
      }
      if (c.crossSellOf?.includes(base.id) || base.crossSellOf?.includes(c.id)) {
        results.push({
          kind: "cross_sell",
          product: c,
          score: 9,
          reason: `Pairs with ${base.name}`,
        });
      }
      if (
        c.bundleWith?.includes(base.id) ||
        base.bundleWith?.includes(c.id)
      ) {
        results.push({
          kind: "bundle",
          product: c,
          score: 11,
          reason: `Bundle with ${base.name}`,
        });
      }
      const related = scoreRelated(base, c);
      if (related > 2) {
        results.push({
          kind: "related",
          product: c,
          score: related,
          reason: "Related from catalog",
        });
      }
    }
  }

  if (opts.query) {
    const q = opts.query.toLowerCase();
    for (const c of active) {
      const hay = `${c.name} ${c.category || ""} ${c.color || ""} ${c.size || ""}`.toLowerCase();
      if (hay.includes(q) || q.split(/\s+/).some((w) => w.length > 2 && hay.includes(w))) {
        results.push({
          kind: "personalized",
          product: c,
          score: 8,
          reason: `Matches “${opts.query.slice(0, 40)}”`,
        });
      }
    }
  }

  // Personalized fallback: top in-stock by category diversity
  if (!results.length) {
    for (const c of active.slice(0, limit)) {
      results.push({
        kind: "personalized",
        product: c,
        score: 1,
        reason: "Popular in-stock pick",
      });
    }
  }

  const seen = new Set<string>();
  return results
    .sort((a, b) => b.score - a.score)
    .filter((r) => {
      if (seen.has(r.product.id)) return false;
      seen.add(r.product.id);
      return true;
    })
    .slice(0, limit);
}

export function formatRecommendationsForReply(
  recs: Recommendation[],
): string {
  if (!recs.length) return "";
  const lines = recs.map((r) => {
    const p = r.product;
    const attrs = [
      p.size ? `size ${p.size}` : null,
      p.color ? p.color : null,
      `৳${p.price}`,
      `stock ${p.stock}`,
    ]
      .filter(Boolean)
      .join(" · ");
    return `• [${r.kind}] ${p.name} — ${attrs}`;
  });
  return ["সাজেস্টেড প্রোডাক্ট:", ...lines].join("\n");
}

export function matchProductFromImageHint(
  catalog: Product[],
  hint: { imageUrl?: string; text?: string },
): {
  product: Product | null;
  confidence: number;
  method: "heuristic" | "none";
  similar: Product[];
} {
  const active = catalog.filter((p) => p.active);
  const blob = `${hint.imageUrl || ""} ${hint.text || ""}`.toLowerCase();
  if (!blob.trim() || !active.length) {
    return { product: null, confidence: 0, method: "none", similar: [] };
  }

  let best: Product | null = null;
  let bestScore = 0;

  for (const p of active) {
    let score = 0;
    const nameTokens = p.name
      .toLowerCase()
      .split(/[^a-z0-9\u0980-\u09FF]+/)
      .filter(Boolean);
    for (const tok of nameTokens) {
      if (tok.length > 2 && blob.includes(tok)) score += 3;
    }
    if (p.sku && blob.includes(p.sku.toLowerCase())) score += 5;
    if (p.color && blob.includes(p.color.toLowerCase())) score += 2;
    if (p.category && blob.includes(p.category.toLowerCase())) score += 1;
    if (p.imageUrl && hint.imageUrl && p.imageUrl === hint.imageUrl) score += 10;
    // Filename heuristics from URL path
    if (hint.imageUrl) {
      try {
        const path = new URL(hint.imageUrl).pathname.toLowerCase();
        for (const tok of nameTokens) {
          if (tok.length > 3 && path.includes(tok)) score += 4;
        }
        if (p.color && path.includes(p.color.toLowerCase())) score += 3;
      } catch {
        /* ignore invalid URL */
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = p;
    }
  }

  if (!best || bestScore < 3) {
    return {
      product: null,
      confidence: 0,
      method: "none",
      similar: active.slice(0, 3),
    };
  }

  const similar = getRecommendations(active, {
    productId: best.id,
    limit: 3,
  }).map((r) => r.product);

  return {
    product: best,
    confidence: Math.min(0.95, 0.4 + bestScore * 0.08),
    method: "heuristic",
    similar,
  };
}

export function formatProductMatchReply(
  product: Product,
  similar: Product[],
  confidence: number,
): string {
  const attrs = [
    `দাম: ৳${product.price}`,
    product.size ? `সাইজ: ${product.size}` : null,
    product.color ? `কালার: ${product.color}` : null,
    `স্টক: ${product.stock}`,
  ]
    .filter(Boolean)
    .join("\n");

  const sim =
    similar.length > 0
      ? [
          "",
          "সিমিলার প্রোডাক্ট:",
          ...similar.map(
            (s) => `• ${s.name} — ৳${s.price} (stock ${s.stock})`,
          ),
        ].join("\n")
      : "";

  return [
    `ম্যাচ পাওয়া গেছে ✓ (${Math.round(confidence * 100)}%)`,
    product.name,
    attrs,
    sim,
    "",
    "অর্ডার করতে নাম + ফোন লিখুন।",
  ].join("\n");
}
