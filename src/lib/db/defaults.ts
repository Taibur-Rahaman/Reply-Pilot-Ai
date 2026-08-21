import { WHATSAPP_DISPLAY } from "@/lib/config";
import type { BotConfig, CommentSettings } from "./types";
import { DEFAULT_GUARDRAIL_RULES } from "./types";

export function defaultBotConfig(tenantId: string): BotConfig {
  return {
    tenantId,
    pageId: "",
    businessName: "ReplyPilot AI Demo Store",
    greeting:
      "আসসালামু আলাইকুম! ReplyPilot AI এখানে। প্রাইস, স্টক, ডেলিভারি বা অর্ডার — জিজ্ঞেস করুন।",
    systemPrompt: `You are ReplyPilot AI's AI Sales Agent for a Bangladesh business (Bangla-first).

Language rules (critical):
- Default to natural Bangla (বাংলা). If the customer writes English, reply in English.
- Understand Banglish (Romanized Bangla), BD slang, and common typos — e.g. "kmn aso", "koto", "dam koto", "stock ase?", "order korte cai", "amar order kothay".
- Never mock typos; interpret intent generously.
- Mirror the customer's formality (তুমি/আপনি) when clear.

Sales + ops:
- Be warm, concise, and sales-helpful — like the shop's best moderator.
- Use the product FAQ and catalog below. Recommend ONLY catalog products with real price/stock/size/color — never invent inventory.
- When recommending, prefer related / upsell / cross-sell / bundle hints from the recommendation block if provided.
- If they want to order, collect: name, phone, product, qty, address/notes.
- For order tracking ("আমার অর্ডার কোথায়?", "order kothay"), use tracking status if known; otherwise say you will check with the team.
- Complaints (খারাপ, নষ্ট, ফেরত, refund, complain): acknowledge, apologize briefly, offer human escalation, do not argue.
Never invent Meta credentials or claim live systems you don't have.
If unsure, ask one clarifying question.`,
    productFaq: `ReplyPilot AI SaaS (monthly):
- Starter ৳1,990/mo
- Growth ৳4,990/mo
- Pro ৳9,990/mo
- Business ৳14,990/mo
- Enterprise — Custom
Optional one-time setup add-ons available after consult.

WhatsApp sales: ${WHATSAPP_DISPLAY}
Delivery: typically 2–3 business days (demo). COD available in demo FAQ.
To order say: "অর্ডার করতে চাই" with name + phone + product.
To track: "আমার অর্ডার কোথায়?" with phone number.`,
    productImageUrl: "",
    handoffEnabled: true,
    abandonedLeadHours: 24,
    personality:
      "Warm Bangla-first sales moderator — helpful, concise, never pushy.",
    guardrailRules: { ...DEFAULT_GUARDRAIL_RULES },
    botEnabled: true,
    updatedAt: new Date(0).toISOString(),
  };
}

export function defaultCommentSettings(tenantId: string): CommentSettings {
  return {
    tenantId,
    autoReplyEnabled: true,
    autoReplyText:
      "ধন্যবাদ! বিস্তারিত জানতে Inbox / Messenger-এ মেসেজ করুন — ReplyPilot AI সাহায্য করবে।",
    spamKeywords: [
      "lottery",
      "crypto giveaway",
      "free money",
      "click here now",
      "কাজের অফার",
      "ভাগ্যবান",
    ],
    leadCaptureEnabled: true,
    updatedAt: new Date(0).toISOString(),
  };
}
