/** OpenAI-compatible LLM + embedding env (Ollama offline, Groq/Gemini free tier, OpenAI). */

export type AiProvider = "ollama" | "groq" | "gemini" | "openai";

export function detectAiProvider(): AiProvider {
  const explicit = process.env.AI_PROVIDER?.trim().toLowerCase();
  if (explicit === "ollama" || explicit === "local" || explicit === "offline") {
    return "ollama";
  }
  if (explicit === "groq") return "groq";
  if (
    explicit === "gemini" ||
    explicit === "google" ||
    explicit === "google-ai"
  ) {
    return "gemini";
  }

  const base = (
    process.env.AI_BASE_URL?.trim() ||
    process.env.OPENAI_BASE_URL?.trim() ||
    ""
  ).toLowerCase();
  if (base.includes("11434") || base.includes("ollama")) return "ollama";
  if (base.includes("groq.com")) return "groq";
  if (base.includes("generativelanguage.googleapis.com")) return "gemini";

  return "openai";
}

export function getAiBaseUrl(): string {
  const custom =
    process.env.AI_BASE_URL?.trim() ||
    process.env.OPENAI_BASE_URL?.trim();
  if (custom) return custom.replace(/\/$/, "");

  switch (detectAiProvider()) {
    case "ollama":
      return "http://127.0.0.1:11434/v1";
    case "groq":
      return "https://api.groq.com/openai/v1";
    case "gemini":
      return "https://generativelanguage.googleapis.com/v1beta/openai";
    default:
      return "https://api.openai.com/v1";
  }
}

/** API key for Authorization header. Ollama uses a placeholder when unset. */
export function getAiApiKey(): string | undefined {
  const key =
    process.env.OPENAI_API_KEY?.trim() ||
    process.env.AI_API_KEY?.trim() ||
    process.env.GROQ_API_KEY?.trim() ||
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_API_KEY?.trim();
  if (key) return key;
  if (detectAiProvider() === "ollama") return "ollama";
  return undefined;
}

export function isAiLlmEnabled(): boolean {
  return Boolean(getAiApiKey());
}

export function getAiModel(): string {
  const custom = process.env.AI_MODEL?.trim();
  if (custom) return custom;

  switch (detectAiProvider()) {
    case "ollama":
      return "qwen2.5:7b-instruct";
    case "groq":
      return "llama-3.3-70b-versatile";
    case "gemini":
      return "gemini-2.0-flash";
    default:
      return "gpt-4o-mini";
  }
}

/** Multimodal chat model (customer image messages). */
export function getAiVisionModel(): string {
  const custom = process.env.AI_VISION_MODEL?.trim();
  if (custom) return custom;
  if (detectAiProvider() === "ollama") return "llava:7b";
  return getAiModel();
}

export function getAiEmbedModel(): string {
  const custom = process.env.AI_EMBED_MODEL?.trim();
  if (custom) return custom;
  if (detectAiProvider() === "ollama") return "nomic-embed-text";
  return "text-embedding-3-small";
}

export function aiProviderSummary(): {
  provider: AiProvider;
  model: string;
  visionModel: string;
  embedModel: string;
  baseUrl: string;
  enabled: boolean;
} {
  return {
    provider: detectAiProvider(),
    model: getAiModel(),
    visionModel: getAiVisionModel(),
    embedModel: getAiEmbedModel(),
    baseUrl: getAiBaseUrl(),
    enabled: isAiLlmEnabled(),
  };
}
