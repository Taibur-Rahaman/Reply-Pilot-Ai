import { NextResponse } from "next/server";
import { generateAiReply } from "@/lib/bot/ai";
import { loadBusinessConfig } from "@/lib/bot/config";
import {
  buildKnowledgeBlob,
  DEFAULT_TENANT_ID,
  formatCatalogForPrompt,
  listProducts,
} from "@/lib/db";

export const runtime = "nodejs";

/**
 * Internal / local test endpoint — generate a reply without Meta.
 * POST { "text": "...", "imageUrl"?: "...", "tenantId"?: "..." }
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      text?: string;
      imageUrl?: string;
      tenantId?: string;
    };
    const text = String(body.text ?? "").trim();
    if (!text && !body.imageUrl) {
      return NextResponse.json(
        { error: "Provide text and/or imageUrl." },
        { status: 400 },
      );
    }

    const tenantId = body.tenantId || DEFAULT_TENANT_ID;
    const config = await loadBusinessConfig(tenantId);
    const products = await listProducts(tenantId, true);
    const catalog = formatCatalogForPrompt(products);
    const knowledge = await buildKnowledgeBlob(tenantId, text);

    const reply = await generateAiReply({
      text,
      config,
      imageUrl: body.imageUrl,
      catalog,
      knowledge,
    });

    return NextResponse.json({
      ok: true,
      reply: reply.text,
      source: reply.source,
      model: reply.model,
      provider: reply.provider,
      note: "This endpoint does not send to Messenger — use /api/messenger/webhook for live Page traffic.",
    });
  } catch (error) {
    console.error("[api/bot/reply]", error);
    return NextResponse.json(
      { error: "Reply generation failed." },
      { status: 500 },
    );
  }
}
