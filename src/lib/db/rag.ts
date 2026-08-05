import { newId, toIso } from "./ids";
import { prisma } from "./prisma";

const EMBED_DIM = 1536;

import {
  getAiApiKey,
  getAiBaseUrl,
  getAiEmbedModel,
} from "@/lib/ai/settings";

/** Split text into overlapping chunks for embedding. */
export function chunkText(
  text: string,
  size = 800,
  overlap = 100,
): string[] {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return [];
  if (cleaned.length <= size) return [cleaned];
  const chunks: string[] = [];
  let i = 0;
  while (i < cleaned.length) {
    chunks.push(cleaned.slice(i, i + size));
    i += size - overlap;
  }
  return chunks;
}

const EMBED_TIMEOUT_MS = 30_000;

async function embedTexts(texts: string[]): Promise<number[][] | null> {
  const apiKey = getAiApiKey();
  if (!apiKey || !texts.length) return null;
  const baseUrl = getAiBaseUrl().replace(/\/$/, "");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), EMBED_TIMEOUT_MS);
  try {
    const response = await fetch(`${baseUrl}/embeddings`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: getAiEmbedModel(),
        input: texts,
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      console.warn("[rag] embed API", response.status);
      return null;
    }
    const data = (await response.json()) as {
      data?: { embedding: number[]; index: number }[];
    };
    const sorted = (data.data || []).slice().sort((a, b) => a.index - b.index);
    return sorted.map((d) => d.embedding);
  } catch (error) {
    console.warn("[rag] embed error", error);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Build a pgvector literal, guarding against non-finite values before they hit raw SQL. */
function vectorLiteral(embedding: number[]): string {
  if (!embedding.every((n) => Number.isFinite(n))) {
    throw new Error("Invalid embedding vector: contains non-finite values.");
  }
  return `[${embedding.join(",")}]`;
}

export async function indexKbDocument(
  tenantId: string,
  documentId: string,
  text: string,
): Promise<number> {
  await prisma.kbChunk.deleteMany({ where: { documentId } });
  const chunks = chunkText(text);
  if (!chunks.length) return 0;

  const embeddings = await embedTexts(chunks);

  for (let i = 0; i < chunks.length; i++) {
    const id = newId("chunk");
    let vec: string | null = null;
    if (embeddings?.[i]) {
      try {
        vec = vectorLiteral(embeddings[i]);
      } catch (error) {
        console.warn("[rag] skipping invalid embedding, storing as keyword-only", error);
      }
    }
    if (vec) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "KbChunk" (id, "tenantId", "documentId", content, "chunkIndex", embedding, "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6::vector, NOW())`,
        id,
        tenantId,
        documentId,
        chunks[i],
        i,
        vec,
      );
    } else {
      await prisma.kbChunk.create({
        data: {
          id,
          tenantId,
          documentId,
          content: chunks[i],
          chunkIndex: i,
        },
      });
    }
  }
  return chunks.length;
}

/** Keyword fallback when embeddings unavailable. */
function keywordScore(query: string, content: string): number {
  const q = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  if (!q.length) return 0;
  const c = content.toLowerCase();
  let hits = 0;
  for (const w of q) {
    if (c.includes(w)) hits += 1;
  }
  return hits / q.length;
}

export async function retrieveKnowledge(
  tenantId: string,
  query: string,
  topK = 5,
): Promise<string> {
  const faqs = await prisma.faqItem.findMany({ where: { tenantId }, take: 20 });
  const faqBlob = faqs
    .map((f) => `Q: ${f.question}\nA: ${f.answer}`)
    .join("\n\n");

  const config = await prisma.botConfig.findUnique({ where: { tenantId } });
  const configSnippet = config?.productFaq?.slice(0, 1200) || "";

  const queryEmbedding = (await embedTexts([query]))?.[0];

  let chunkTexts: string[] = [];

  if (queryEmbedding) {
    try {
      const vec = vectorLiteral(queryEmbedding);
      const rows = await prisma.$queryRawUnsafe<
        { content: string; distance: number }[]
      >(
        `SELECT content, (embedding <=> $1::vector) AS distance
         FROM "KbChunk"
         WHERE "tenantId" = $2 AND embedding IS NOT NULL
         ORDER BY embedding <=> $1::vector
         LIMIT $3`,
        vec,
        tenantId,
        topK,
      );
      chunkTexts = rows.map((r) => r.content);
    } catch (error) {
      console.warn("[rag] vector search failed, keyword fallback", error);
    }
  }

  if (!chunkTexts.length) {
    const all = await prisma.kbChunk.findMany({
      where: { tenantId },
      take: 200,
    });
    chunkTexts = all
      .map((c) => ({ content: c.content, score: keywordScore(query, c.content) }))
      .filter((c) => c.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map((c) => c.content);

    // Also score FAQ answers
    if (chunkTexts.length < topK) {
      const faqHits = faqs
        .map((f) => ({
          content: `Q: ${f.question}\nA: ${f.answer}`,
          score: keywordScore(query, `${f.question} ${f.answer}`),
        }))
        .filter((f) => f.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, topK - chunkTexts.length);
      chunkTexts.push(...faqHits.map((f) => f.content));
    }
  }

  const parts: string[] = [];
  if (configSnippet) {
    parts.push("## Product FAQ (config excerpt)\n" + configSnippet);
  }
  if (chunkTexts.length) {
    parts.push(
      "## Retrieved knowledge\n" +
        chunkTexts.map((c, i) => `### Chunk ${i + 1}\n${c}`).join("\n\n"),
    );
  } else if (faqBlob) {
    parts.push("## FAQ items\n" + faqBlob.slice(0, 3000));
  }

  return parts.join("\n\n") || "(No knowledge yet.)";
}

export { EMBED_DIM, toIso };
