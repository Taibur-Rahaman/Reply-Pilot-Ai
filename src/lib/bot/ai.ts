import {
  detectAiProvider,
  getAiApiKey,
  getAiBaseUrl,
  getAiModel,
  getAiVisionModel,
  type BusinessConfig,
} from "./config";

export type ChatTurn = { role: "system" | "user" | "assistant"; content: string };

export type AiReplyResult = {
  text: string;
  source: "llm" | "rules" | "fallback";
  model?: string;
  provider?: string;
};

const PHOTO_ASK =
  /ছবি|photo|picture|pic|image|ক্যাটালগ|catalog|দেখাও|show me/i;

export function wantsProductPhoto(text: string): boolean {
  return PHOTO_ASK.test(text);
}

export function buildSystemMessage(
  config: BusinessConfig,
  extras?: {
    catalog?: string;
    knowledge?: string;
    recommendations?: string;
  },
): string {
  const rules = config.guardrailRules;
  const guardrailLines = [
    "Hard guardrails (must obey):",
    rules?.neverInventStock !== false
      ? "- NEVER invent stock, prices, discounts, or products outside the catalog."
      : null,
    rules?.collectPhone !== false
      ? "- When taking an order, always collect phone number."
      : null,
    rules?.confirmOrder !== false
      ? "- Confirm order details (name, phone, product, qty) before finalizing."
      : null,
    rules?.escalateRefund !== false
      ? "- Escalate refund / return money requests to a human."
      : null,
    rules?.escalateLegal !== false
      ? "- Escalate legal / police / lawsuit language to a human."
      : null,
    rules?.escalateAngry !== false
      ? "- Escalate clearly angry / abusive customers to a human."
      : null,
    rules?.escalateLowConfidence !== false
      ? `- If confidence is below ${Math.round((rules?.confidenceThreshold ?? 0.7) * 100)}%, say you will check with the team — do not guess.`
      : null,
  ].filter(Boolean);

  return [
    config.systemPrompt,
    "",
    `Business: ${config.businessName}`,
    config.personality
      ? `Personality: ${config.personality}`
      : "",
    "",
    "Bangla-first operating rules:",
    "- Prefer বাংলা; switch to English only if the user writes primarily in English.",
    "- Accept Banglish, BD slang, and typos (koto, dam, stock ase, order korte cai, kmn, pls, etc.).",
    "- Never invent products, prices, or stock outside the catalog.",
    "",
    ...guardrailLines,
    "",
    "Product / FAQ knowledge (retrieved — use only these facts):",
    extras?.knowledge || config.productFaq,
    extras?.catalog
      ? `\nProduct catalog (recommend ONLY from this list — never invent price/stock):\n${extras.catalog}`
      : "",
    extras?.recommendations
      ? `\nRecommendation hints (related/upsell/cross-sell/bundle):\n${extras.recommendations}`
      : "",
    "",
    "Sales agent rules:",
    "- Recommend 1–2 fitting in-stock products when the buyer asks what to buy / gift / budget.",
    "- Offer upsell/cross-sell/bundle only from recommendation hints or catalog relations.",
    "- For order tracking questions, prefer facts from order status — do not invent courier tracking numbers.",
    "- Complaints: apologize, escalate path, do not argue.",
    "- If knowledge does not cover the answer, say you will check with the team.",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Rule-based replies when no API key — still useful for demos. */
export function rulesReply(
  text: string,
  config: BusinessConfig,
  extras?: { catalog?: string; recommendations?: string },
): string | null {
  const t = text.trim().toLowerCase();

  if (!t || /^(hi|hello|hey|assalam|সালাম|আসসালাম|হ্যালো|হাই|kmn|ki khobor)\b/.test(t)) {
    return config.greeting;
  }

  if (
    /recommend|সাজেস্ট|কী কিনব|কি কিনব|কোনটা ভালো|suggest|best product|ক্যাটালগ|upsell|cross.?sell|bundle/.test(
      t,
    )
  ) {
    if (extras?.recommendations) {
      return [
        extras.recommendations,
        "",
        "পছন্দ হলে নাম + ফোন + প্রোডাক্ট লিখে অর্ডার করুন।",
      ].join("\n");
    }
    if (extras?.catalog && !extras.catalog.includes("No catalog")) {
      return [
        "ক্যাটালগ থেকে সাজেস্ট:",
        extras.catalog.split("\n").slice(0, 5).join("\n"),
        "",
        "পছন্দ হলে নাম + ফোন + প্রোডাক্ট লিখে অর্ডার করুন।",
      ].join("\n");
    }
  }

  if (
    /price|প্রাইস|দাম|কত|৳|package|প্যাকেজ|plan|starter|growth|pro|business|1990|4990|9990|14990/.test(
      t,
    )
  ) {
    return [
      "FaceTai SaaS (monthly):",
      "• Starter — ৳1,990/mo",
      "• Growth — ৳4,990/mo",
      "• Pro — ৳9,990/mo",
      "• Business — ৳14,990/mo",
      "• Enterprise — Custom",
      "",
      "সাধারণ ব্যবহারের জন্য কোনো অতিরিক্ত API/Hosting চার্জ নেই (fair use)।",
      extras?.catalog && !extras.catalog.includes("No catalog")
        ? `\nস্টোর ক্যাটালগ:\n${extras.catalog}`
        : `\nবিস্তারিত FAQ:\n${config.productFaq.slice(0, 600)}`,
    ].join("\n");
  }

  if (/whatsapp|হোয়াটসঅ্যাপ|যোগাযোগ|contact|ফোন/.test(t)) {
    return "WhatsApp / Call: 01810-285559 — অথবা এখানেই অর্ডারের ডিটেইল লিখে পাঠান।";
  }

  if (/ডেলিভারি|delivery|কতদিন/.test(t)) {
    return "সাধারণত ২–৩ কর্মদিবস ডেলিভারি (ডেমো FAQ)। ঠিকানা সহ অর্ডার দিলে নিশ্চিত করে বলব।";
  }

  if (wantsProductPhoto(text) && config.productImageUrl) {
    return "PRODUCT_IMAGE";
  }

  if (wantsProductPhoto(text)) {
    return "প্রোডাক্ট ছবি এখনো কনফিগার করা নেই। Dashboard → Catalog থেকে image URL সেট করুন, অথবা WhatsApp 01810-285559-এ ক্যাটালগ চান।";
  }

  if (/অর্ডার|order|order korte/.test(t)) {
    return [
      "অর্ডার নিতে এভাবে লিখুন:",
      "অর্ডার করতে চাই",
      "নাম: …",
      "ফোন: 01XXXXXXXXX",
      "প্রোডাক্ট: …",
      "পরিমাণ: 1",
    ].join("\n");
  }

  return null;
}

export async function generateAiReply(options: {
  text: string;
  config: BusinessConfig;
  imageUrl?: string;
  catalog?: string;
  knowledge?: string;
  recommendations?: string;
}): Promise<AiReplyResult> {
  const { text, config, imageUrl, catalog, knowledge, recommendations } =
    options;
  const apiKey = getAiApiKey();
  const extras = { catalog, knowledge, recommendations };

  if (!apiKey) {
    const ruled = rulesReply(text, config, extras);
    if (ruled) {
      return { text: ruled, source: "rules" };
    }
    return {
      text: [
        config.greeting,
        "",
        "আমি এখন rule-based মোডে আছি (AI API key সেট নেই)।",
        "প্রাইস, ডেলিভারি, অর্ডার, ট্র্যাকিং বা ছবি জিজ্ঞেস করতে পারেন — অথবা WhatsApp 01810-285559।",
      ].join("\n"),
      source: "fallback",
    };
  }

  const provider = detectAiProvider();
  const model = imageUrl ? getAiVisionModel() : getAiModel();
  const baseUrl = getAiBaseUrl().replace(/\/$/, "");

  const userContent: unknown = imageUrl
    ? [
        {
          type: "text",
          text:
            text ||
            "Customer sent an image. Match to catalog if possible; reply in Bangla with price/size/color/stock and 1–2 similar products.",
        },
        { type: "image_url", image_url: { url: imageUrl } },
      ]
    : text;

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.5,
        max_tokens: 500,
        messages: [
          { role: "system", content: buildSystemMessage(config, extras) },
          { role: "user", content: userContent },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.error("[ai] API error", response.status, errText.slice(0, 300));
      const ruled = rulesReply(text, config, extras);
      return {
        text:
          ruled ||
          "একটু সমস্যা হচ্ছে AI রিপ্লাইতে। WhatsApp 01810-285559-এ মেসেজ করুন, অথবা আবার চেষ্টা করুন।",
        source: "fallback",
      };
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      const ruled = rulesReply(text, config, extras);
      return {
        text: ruled || config.greeting,
        source: "fallback",
      };
    }

    return { text: content, source: "llm", model, provider };
  } catch (error) {
    console.error("[ai] fetch error:", error);
    const ruled = rulesReply(text, config, extras);
    return {
      text:
        ruled ||
        "নেটওয়ার্ক সমস্যার জন্য এখন AI রিপ্লাই যাচ্ছে না। পরে আবার চেষ্টা করুন বা WhatsApp 01810-285559।",
      source: "fallback",
    };
  }
}

/** Vision stub when no multimodal model / key — acknowledge only. */
export function acknowledgeImageStub(): string {
  return "ছবি পেয়েছি ✓ দেখে নিচ্ছি। সাইজ, কালার বা অর্ডার করতে চাইলে লিখুন — সাহায্য করছি।";
}
