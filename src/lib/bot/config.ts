import {
  getBotConfig,
  saveBotConfig,
  type BotConfig as DbBotConfig,
} from "@/lib/db";

import type { GuardrailRules } from "@/lib/db/types";
import { DEFAULT_GUARDRAIL_RULES } from "@/lib/db/types";

/** @deprecated Prefer tenant-scoped BotConfig from db — kept for admin-lite compat. */
export type BusinessConfig = {
  pageId: string;
  businessName: string;
  greeting: string;
  systemPrompt: string;
  productFaq: string;
  productImageUrl: string;
  handoffEnabled: boolean;
  abandonedLeadHours?: number;
  personality?: string;
  guardrailRules?: GuardrailRules;
  updatedAt: string;
};

export function toBusinessConfig(c: DbBotConfig): BusinessConfig {
  return {
    pageId: c.pageId,
    businessName: c.businessName,
    greeting: c.greeting,
    systemPrompt: c.systemPrompt,
    productFaq: c.productFaq,
    productImageUrl: c.productImageUrl,
    handoffEnabled: c.handoffEnabled,
    abandonedLeadHours: c.abandonedLeadHours,
    personality: c.personality,
    guardrailRules: c.guardrailRules || DEFAULT_GUARDRAIL_RULES,
    updatedAt: c.updatedAt,
  };
}

export async function loadBusinessConfig(
  tenantId?: string,
): Promise<BusinessConfig> {
  const { DEFAULT_TENANT_ID } = await import("@/lib/db/types");
  const config = await getBotConfig(tenantId || DEFAULT_TENANT_ID);
  return toBusinessConfig(config);
}

export async function saveBusinessConfig(
  patch: Partial<BusinessConfig>,
  tenantId?: string,
): Promise<BusinessConfig> {
  const { DEFAULT_TENANT_ID } = await import("@/lib/db/types");
  const saved = await saveBotConfig(tenantId || DEFAULT_TENANT_ID, patch);
  return toBusinessConfig(saved);
}

export function getPageAccessToken(): string | undefined {
  return process.env.META_PAGE_ACCESS_TOKEN?.trim() || undefined;
}

export function getMetaVerifyToken(): string | undefined {
  return process.env.META_VERIFY_TOKEN?.trim() || undefined;
}

export function getMetaAppSecret(): string | undefined {
  return process.env.META_APP_SECRET?.trim() || undefined;
}

export function getAdminPassword(): string | undefined {
  return process.env.ADMIN_PASSWORD?.trim() || undefined;
}

export {
  aiProviderSummary,
  detectAiProvider,
  getAiApiKey,
  getAiBaseUrl,
  getAiEmbedModel,
  getAiModel,
  getAiVisionModel,
  isAiLlmEnabled,
  type AiProvider,
} from "@/lib/ai/settings";
