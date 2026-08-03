import { NextResponse } from "next/server";
import {
  DEFAULT_TENANT_ID,
  ingestChannelMessage,
  appendMessage,
  type Channel,
  formatCatalogForPrompt,
  listProducts,
  buildKnowledgeBlob,
} from "@/lib/db";
import { generateAiReply } from "@/lib/bot/ai";
import { loadBusinessConfig } from "@/lib/bot/config";
import {
  formatRecommendationsForReply,
  getRecommendations,
} from "@/lib/bot/intelligence";

export const runtime = "nodejs";

/**
 * Public website chat widget endpoint.
 * Creates web-channel conversations in the same multi-tenant store.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      text?: string;
      senderId?: string;
      senderName?: string;
      tenantId?: string;
      reply?: boolean;
    };
    const text = String(body.text || "").trim();
    if (!text) {
      return NextResponse.json({ error: "text required." }, { status: 400 });
    }

    const tenantId = body.tenantId || DEFAULT_TENANT_ID;
    const channel: Channel = "web";
    const senderId =
      body.senderId?.trim() ||
      `web_${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;

    const { conversation, message } = await ingestChannelMessage({
      tenantId,
      channel,
      senderId,
      senderName: body.senderName || "Website visitor",
      text,
      pageId: "web_widget",
    });

    let replyText: string | undefined;
    if (body.reply !== false) {
      const config = await loadBusinessConfig(tenantId);
      const products = await listProducts(tenantId, true);
      const catalog = formatCatalogForPrompt(products);
      const knowledge = await buildKnowledgeBlob(tenantId, text);
      const recommendations = formatRecommendationsForReply(
        getRecommendations(products, { query: text, limit: 3 }),
      );
      const ai = await generateAiReply({
        text,
        config,
        catalog,
        knowledge,
        recommendations,
      });
      replyText = ai.text;
      await appendMessage({
        tenantId,
        conversationId: conversation.id,
        direction: "outbound",
        text: replyText,
      });
    }

    return NextResponse.json({
      ok: true,
      channel,
      conversationId: conversation.id,
      senderId,
      message,
      reply: replyText,
    });
  } catch (error) {
    console.error("[api/webchat]", error);
    return NextResponse.json({ error: "Webchat failed." }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "POST /api/webchat",
    note: "Website chat widget — messages land in Omnichannel Inbox (channel=web).",
  });
}
