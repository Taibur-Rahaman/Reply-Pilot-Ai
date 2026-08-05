/** Support line. Same number for calls and WhatsApp: 01601677122. */
export const WHATSAPP_NUMBER =
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/\D/g, "") ||
  "8801601677122";

export const WHATSAPP_DISPLAY = "01601-677122";

export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`;

/** Only set when you have a real Page username / m.me link — never invent one. */
export const MESSENGER_URL =
  process.env.NEXT_PUBLIC_MESSENGER_URL?.trim() || undefined;

export function whatsappUrlWithText(text: string) {
  return `${WHATSAPP_URL}?text=${encodeURIComponent(text)}`;
}

/** Public site (production: https://replypilotai.shop) */
export const SITE_NAME =
  process.env.NEXT_PUBLIC_SITE_NAME?.trim() || "ReplyPilot AI";

export const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://replypilotai.shop";

/**
 * Pre-filled WhatsApp messages, one per place we link from.
 *
 * Tapping a WhatsApp link opens the chat with the message already typed, so the
 * customer only has to press send. Two things every template must carry:
 *
 *   1. Which product this is about — the same number answers other things, and
 *      a bare "hi" costs a round trip just to work out who is asking.
 *   2. Why they are writing — so support can answer in the first reply.
 *
 * Written in the first person as the customer, because that is who is sending
 * it. Kept short so it stays readable in WhatsApp's single-line input preview.
 *
 * Declared after SITE_NAME on purpose: these are evaluated at module load, so
 * referencing SITE_NAME above its own declaration would hit the temporal dead
 * zone and throw.
 */
export const WHATSAPP_TEMPLATES = {
  /** Landing page hero and final call to action. */
  consultation: `Hello ${SITE_NAME}, I saw your website and I want a free consultation about the AI that replies to my customers.`,

  /** Generic "contact us" links — footer, privacy, terms. */
  general: `Hello ${SITE_NAME}, I have a question about your service.`,

  /** "Can't sign in?" on the login screen. */
  signIn: `Hello ${SITE_NAME}, I cannot sign in to my account. Please help me.`,

  /** "Need help?" during the 3-step setup wizard. */
  onboarding: `Hello ${SITE_NAME}, I am setting up my account and I need help connecting my Facebook Page.`,
} as const;

/** Convenience: `whatsappLink("signIn")` → a ready-to-use wa.me URL. */
export function whatsappLink(template: keyof typeof WHATSAPP_TEMPLATES) {
  return whatsappUrlWithText(WHATSAPP_TEMPLATES[template]);
}

export const LOGIN_PATH = "/login";
export const DASHBOARD_PATH = "/app";

export const INTEREST_OPTIONS = [
  {
    value: "monthly",
    label: "SaaS monthly plan — from ৳1,990/mo (Starter)",
  },
  {
    value: "chatbot-rule",
    label: "One-time setup add-on (Rule-based) — ৳3,900 – ৳6,900",
  },
  {
    value: "chatbot-ai",
    label: "One-time AI Bot setup add-on — ৳8,000 – ৳20,000",
  },
  {
    value: "custom-messenger",
    label: "Custom ReplyPilot AI Agent — ৳15,000+",
  },
  {
    value: "not-sure",
    label: "Not sure yet — help me choose",
  },
] as const;

export type InterestValue = (typeof INTEREST_OPTIONS)[number]["value"];
