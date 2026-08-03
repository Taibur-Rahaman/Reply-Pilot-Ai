import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { DATA_DIR, newId, toIso } from "./ids";
import { prisma } from "./prisma";
import { writeAuditLog } from "./audit";
import { indexKbDocument, retrieveKnowledge } from "./rag";
import type {
  BotConfig,
  FaqItem,
  GuardrailRules,
  KbDocument,
  KbSource,
} from "./types";
import { DEFAULT_GUARDRAIL_RULES } from "./types";
import { defaultBotConfig } from "./defaults";
import type { Prisma } from "@prisma/client";

function parseGuardrails(raw: unknown): GuardrailRules {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_GUARDRAIL_RULES };
  return { ...DEFAULT_GUARDRAIL_RULES, ...(raw as Partial<GuardrailRules>) };
}

function mapBotConfig(row: {
  tenantId: string;
  pageId: string;
  businessName: string;
  greeting: string;
  systemPrompt: string;
  productFaq: string;
  productImageUrl: string;
  handoffEnabled: boolean;
  abandonedLeadHours: number;
  personality: string;
  guardrailRules: unknown;
  updatedAt: Date;
}): BotConfig {
  return {
    tenantId: row.tenantId,
    pageId: row.pageId,
    businessName: row.businessName,
    greeting: row.greeting,
    systemPrompt: row.systemPrompt,
    productFaq: row.productFaq,
    productImageUrl: row.productImageUrl,
    handoffEnabled: row.handoffEnabled,
    abandonedLeadHours: row.abandonedLeadHours,
    personality: row.personality || "",
    guardrailRules: parseGuardrails(row.guardrailRules),
    updatedAt: toIso(row.updatedAt),
  };
}

export async function getBotConfig(tenantId: string): Promise<BotConfig> {
  const existing = await prisma.botConfig.findUnique({ where: { tenantId } });
  if (existing) return mapBotConfig(existing);
  const createdDefaults = defaultBotConfig(tenantId);
  const created = await prisma.botConfig.create({
    data: {
      tenantId,
      pageId: createdDefaults.pageId,
      businessName: createdDefaults.businessName,
      greeting: createdDefaults.greeting,
      systemPrompt: createdDefaults.systemPrompt,
      productFaq: createdDefaults.productFaq,
      productImageUrl: createdDefaults.productImageUrl,
      handoffEnabled: createdDefaults.handoffEnabled,
      abandonedLeadHours: createdDefaults.abandonedLeadHours,
      personality: createdDefaults.personality,
      guardrailRules: createdDefaults.guardrailRules,
    },
  });
  return mapBotConfig(created);
}

export async function saveBotConfig(
  tenantId: string,
  patch: Partial<BotConfig>,
  actor?: { userId?: string; email?: string },
): Promise<BotConfig> {
  const current = await getBotConfig(tenantId);
  const next = {
    ...current,
    ...patch,
    tenantId,
    guardrailRules: patch.guardrailRules
      ? { ...DEFAULT_GUARDRAIL_RULES, ...patch.guardrailRules }
      : current.guardrailRules,
  };
  const saved = await prisma.botConfig.upsert({
    where: { tenantId },
    create: {
      tenantId,
      pageId: next.pageId,
      businessName: next.businessName,
      greeting: next.greeting,
      systemPrompt: next.systemPrompt,
      productFaq: next.productFaq,
      productImageUrl: next.productImageUrl,
      handoffEnabled: next.handoffEnabled,
      abandonedLeadHours: next.abandonedLeadHours,
      personality: next.personality || "",
      guardrailRules: next.guardrailRules as Prisma.InputJsonValue,
    },
    update: {
      pageId: next.pageId,
      businessName: next.businessName,
      greeting: next.greeting,
      systemPrompt: next.systemPrompt,
      productFaq: next.productFaq,
      productImageUrl: next.productImageUrl,
      handoffEnabled: next.handoffEnabled,
      abandonedLeadHours: next.abandonedLeadHours,
      personality: next.personality || "",
      guardrailRules: next.guardrailRules as Prisma.InputJsonValue,
    },
  });
  await writeAuditLog({
    tenantId,
    actorId: actor?.userId,
    actorEmail: actor?.email,
    action: "config.bot_update",
    entityType: "bot_config",
    entityId: tenantId,
  }).catch(() => undefined);
  return mapBotConfig(saved);
}

export async function listFaq(tenantId: string): Promise<FaqItem[]> {
  const rows = await prisma.faqItem.findMany({ where: { tenantId } });
  return rows.map((f) => ({
    id: f.id,
    tenantId: f.tenantId,
    question: f.question,
    answer: f.answer,
    updatedAt: toIso(f.updatedAt),
  }));
}

export async function upsertFaq(
  tenantId: string,
  input: { id?: string; question: string; answer: string },
): Promise<FaqItem> {
  if (input.id) {
    const existing = await prisma.faqItem.findFirst({
      where: { id: input.id, tenantId },
    });
    if (existing) {
      const updated = await prisma.faqItem.update({
        where: { id: existing.id },
        data: {
          question: input.question.trim(),
          answer: input.answer.trim(),
        },
      });
      return {
        id: updated.id,
        tenantId: updated.tenantId,
        question: updated.question,
        answer: updated.answer,
        updatedAt: toIso(updated.updatedAt),
      };
    }
  }
  const item = await prisma.faqItem.create({
    data: {
      id: newId("faq"),
      tenantId,
      question: input.question.trim(),
      answer: input.answer.trim(),
    },
  });
  return {
    id: item.id,
    tenantId: item.tenantId,
    question: item.question,
    answer: item.answer,
    updatedAt: toIso(item.updatedAt),
  };
}

export async function deleteFaq(
  tenantId: string,
  faqId: string,
): Promise<boolean> {
  const existing = await prisma.faqItem.findFirst({
    where: { id: faqId, tenantId },
  });
  if (!existing) return false;
  await prisma.faqItem.delete({ where: { id: faqId } });
  return true;
}

function mapKb(d: {
  id: string;
  tenantId: string;
  filename: string;
  mimeType: string;
  source: string;
  extractedText: string;
  storagePath: string | null;
  status: string;
  note: string | null;
  createdAt: Date;
}): KbDocument {
  return {
    id: d.id,
    tenantId: d.tenantId,
    filename: d.filename,
    mimeType: d.mimeType,
    source: d.source as KbSource,
    extractedText: d.extractedText,
    storagePath: d.storagePath || undefined,
    status: d.status as KbDocument["status"],
    note: d.note || undefined,
    createdAt: toIso(d.createdAt),
  };
}

export async function listKbDocuments(
  tenantId: string,
): Promise<KbDocument[]> {
  const rows = await prisma.kbDocument.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(mapKb);
}

function extractTextBestEffort(
  filename: string,
  mimeType: string,
  buffer: Buffer,
): { text: string; status: KbDocument["status"]; note?: string } {
  const lower = filename.toLowerCase();
  if (
    mimeType.includes("text") ||
    lower.endsWith(".txt") ||
    lower.endsWith(".md") ||
    lower.endsWith(".csv")
  ) {
    return { text: buffer.toString("utf8").slice(0, 50000), status: "ready" };
  }

  const raw = buffer.toString("latin1");
  const chunks = raw.match(/[\x20-\x7E\u0980-\u09FF]{4,}/g) || [];
  const text = chunks.join(" ").replace(/\s+/g, " ").trim().slice(0, 30000);

  if (lower.endsWith(".pdf") || mimeType.includes("pdf")) {
    return {
      text: text || "(No extractable text — re-upload as TXT/CSV or paste FAQ.)",
      status: text.length > 40 ? "ready" : "pending",
      note: "Best-effort PDF text extract. Prefer TXT/CSV for reliable grounding.",
    };
  }

  if (
    lower.endsWith(".xlsx") ||
    lower.endsWith(".xls") ||
    lower.endsWith(".csv") ||
    mimeType.includes("sheet") ||
    mimeType.includes("excel")
  ) {
    return {
      text: text || "(Excel binary — export CSV for better extract.)",
      status: text.length > 20 ? "ready" : "pending",
      note: "Best-effort Excel extract. CSV uploads work best.",
    };
  }

  if (lower.endsWith(".docx") || mimeType.includes("word")) {
    return {
      text: "",
      status: "stub",
      note: "DOCX ingest coming in Wave B (F48). File stored; not grounded yet.",
    };
  }

  return {
    text: text.slice(0, 5000),
    status: text ? "ready" : "pending",
    note: "Generic extract.",
  };
}

export async function storeKbUpload(input: {
  tenantId: string;
  filename: string;
  mimeType: string;
  buffer: Buffer;
  source?: KbSource;
  actor?: { userId?: string; email?: string };
}): Promise<KbDocument> {
  const uploadsDir = path.join(DATA_DIR, "uploads", input.tenantId);
  await mkdir(uploadsDir, { recursive: true });
  const safeName = input.filename.replace(/[^\w.\-()\s\u0980-\u09FF]/g, "_");
  const id = newId("kb");
  const storagePath = path.join("uploads", input.tenantId, `${id}_${safeName}`);
  await writeFile(path.join(DATA_DIR, storagePath), input.buffer);

  const extracted = extractTextBestEffort(
    input.filename,
    input.mimeType,
    input.buffer,
  );

  const doc = await prisma.kbDocument.create({
    data: {
      id,
      tenantId: input.tenantId,
      filename: input.filename,
      mimeType: input.mimeType || "application/octet-stream",
      source: input.source || guessSource(input.filename, input.mimeType),
      extractedText: extracted.text,
      storagePath,
      status: extracted.status,
      note: extracted.note,
    },
  });

  if (extracted.status === "ready" && extracted.text.trim()) {
    await indexKbDocument(input.tenantId, id, extracted.text).catch((err) =>
      console.warn("[kb] index failed", err),
    );
  }

  await writeAuditLog({
    tenantId: input.tenantId,
    actorId: input.actor?.userId,
    actorEmail: input.actor?.email,
    action: "kb.upload",
    entityType: "kb_document",
    entityId: id,
    meta: { filename: input.filename },
  }).catch(() => undefined);

  return mapKb(doc);
}

function guessSource(filename: string, mime: string): KbSource {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf") || mime.includes("pdf")) return "pdf";
  if (
    lower.endsWith(".xlsx") ||
    lower.endsWith(".xls") ||
    lower.endsWith(".csv") ||
    mime.includes("sheet") ||
    mime.includes("excel")
  ) {
    return "excel";
  }
  if (lower.endsWith(".docx") || mime.includes("word")) return "docx";
  return "manual";
}

export async function createKbStub(input: {
  tenantId: string;
  filename: string;
  source: KbSource;
  note: string;
}): Promise<KbDocument> {
  const doc = await prisma.kbDocument.create({
    data: {
      id: newId("kb"),
      tenantId: input.tenantId,
      filename: input.filename,
      mimeType: "text/plain",
      source: input.source,
      extractedText: "",
      status: "stub",
      note: input.note,
    },
  });
  return mapKb(doc);
}

/** RAG retrieve top-k; falls back to short FAQ+config snippet (not full dump). */
export async function buildKnowledgeBlob(
  tenantId: string,
  query?: string,
): Promise<string> {
  if (query?.trim()) {
    const retrieved = await retrieveKnowledge(tenantId, query, 5);
    if (retrieved.trim()) return retrieved;
  }

  const config = await prisma.botConfig.findUnique({ where: { tenantId } });
  const faqs = await prisma.faqItem.findMany({
    where: { tenantId },
    take: 8,
  });
  const parts: string[] = [];
  if (config?.productFaq) {
    parts.push(
      "## Product FAQ (config)\n" + config.productFaq.slice(0, 2000),
    );
  }
  if (faqs.length) {
    parts.push(
      "## FAQ items\n" +
        faqs.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join("\n\n"),
    );
  }
  return parts.join("\n\n") || "(No knowledge yet.)";
}
