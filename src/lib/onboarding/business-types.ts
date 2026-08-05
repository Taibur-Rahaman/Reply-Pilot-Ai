/**
 * Business types and the AI configuration each one implies.
 *
 * The user picks a card with a picture on it. Everything technical that used to
 * be typed by hand on the Knowledge screen — system prompt, tone, starter FAQs
 * — is derived from that choice plus their plain answers. The words "prompt",
 * "personality", and "system" never appear on screen.
 */

export type BusinessTypeId =
  | "restaurant"
  | "shop"
  | "clinic"
  | "education"
  | "property"
  | "other";

export type BusinessType = {
  id: BusinessTypeId;
  label: string;
  icon: string;
  /** Tone fragment folded into the generated instructions. */
  tone: string;
  /** Questions this kind of business is most often asked. */
  starterQuestions: string[];
};

export const BUSINESS_TYPES: BusinessType[] = [
  {
    id: "restaurant",
    label: "Restaurant",
    icon: "🍽️",
    tone: "warm and appetising, happy to describe dishes",
    starterQuestions: [
      "What is on the menu today?",
      "Do you deliver?",
      "What time do you close?",
    ],
  },
  {
    id: "shop",
    label: "Shop",
    icon: "🛒",
    tone: "friendly and helpful about stock, sizes, and prices",
    starterQuestions: [
      "Is this in stock?",
      "How much does it cost?",
      "Do you deliver to my area?",
    ],
  },
  {
    id: "clinic",
    label: "Clinic",
    icon: "🏥",
    tone: "calm, respectful, and careful never to give medical advice",
    starterQuestions: [
      "How do I book an appointment?",
      "What are your visiting hours?",
      "What is the consultation fee?",
    ],
  },
  {
    id: "education",
    label: "Education",
    icon: "📚",
    tone: "encouraging and clear about courses and fees",
    starterQuestions: [
      "What courses do you offer?",
      "How much is the course fee?",
      "When does the next batch start?",
    ],
  },
  {
    id: "property",
    label: "Property",
    icon: "🏠",
    tone: "professional and precise about locations and prices",
    starterQuestions: [
      "What properties are available?",
      "What is the rent?",
      "Can I visit the property?",
    ],
  },
  {
    id: "other",
    label: "Other",
    icon: "✨",
    tone: "friendly, clear, and helpful",
    starterQuestions: [
      "What do you sell?",
      "Where are you located?",
      "What time are you open?",
    ],
  },
];

export function getBusinessType(id: string): BusinessType {
  return BUSINESS_TYPES.find((t) => t.id === id) ?? BUSINESS_TYPES[5];
}

export type OnboardingAnswers = {
  businessType: BusinessTypeId;
  businessName: string;
  phone: string;
  address: string;
  hours: string;
  delivery: string;
  sells: string;
  rules: string;
};

/**
 * Compose the AI instructions from the user's plain answers.
 *
 * Only non-empty answers are included, so skipping a question leaves the
 * assistant silent on that topic rather than asserting a blank value — telling
 * a customer the shop closes at "" is worse than not answering.
 */
export function buildAiInstructions(answers: OnboardingAnswers): string {
  const type = getBusinessType(answers.businessType);
  const name = answers.businessName.trim() || "this business";

  const facts: string[] = [];
  if (answers.phone.trim()) facts.push(`Phone number: ${answers.phone.trim()}`);
  if (answers.address.trim()) facts.push(`Location: ${answers.address.trim()}`);
  if (answers.hours.trim()) facts.push(`Opening hours: ${answers.hours.trim()}`);
  if (answers.delivery.trim()) facts.push(`Delivery: ${answers.delivery.trim()}`);
  if (answers.sells.trim()) facts.push(`What we sell: ${answers.sells.trim()}`);
  if (answers.rules.trim())
    facts.push(`Important rules: ${answers.rules.trim()}`);

  return [
    `You are the customer service assistant for ${name}, a ${type.label.toLowerCase()} business.`,
    `Be ${type.tone}. Reply in the same language the customer writes in — Bangla or English.`,
    "",
    "What you know about this business:",
    ...facts.map((f) => `- ${f}`),
    "",
    "Rules you must always follow:",
    "- Never invent prices, stock, or delivery times. If you do not know, say you will check and ask a person to help.",
    "- Always collect the customer's phone number before confirming an order.",
    "- Repeat the order back to the customer before confirming it.",
    "- If a customer asks for a refund, is angry, or mentions legal action, hand the conversation to a person immediately.",
    "- Keep replies short and easy to read.",
  ].join("\n");
}

/** Greeting shown to a customer's first message. */
export function buildGreeting(answers: OnboardingAnswers): string {
  const name = answers.businessName.trim() || "us";
  return `Hello! Welcome to ${name}. How can I help you today?`;
}
