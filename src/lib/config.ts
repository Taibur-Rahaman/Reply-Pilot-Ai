export const WHATSAPP_NUMBER =
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/\D/g, "") ||
  "8801810285559";

export const WHATSAPP_DISPLAY = "01810-285559";

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

export const LOGIN_PATH = "/login";
export const DASHBOARD_PATH = "/dashboard";

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
    label: "Custom FaceTai AI Agent — ৳15,000+",
  },
  {
    value: "not-sure",
    label: "Not sure yet — help me choose",
  },
] as const;

export type InterestValue = (typeof INTEREST_OPTIONS)[number]["value"];
