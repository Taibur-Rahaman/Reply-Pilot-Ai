import { NextResponse } from "next/server";
import {
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
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { resolvePublicTenantId } from "@/lib/tenant-scope";

export const runtime = "nodejs";

/**
 * Public website chat widget endpoint.
 * Creates web-channel conversations in the same multi-tenant store.
 */
export async function POST(request: Request) {
  const rl = checkRateLimit(`webchat:${getClientIp(request)}`, 30, 5 * 60 * 1000);
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterSec!);

  try {
    const body = (await request.json()) as {
      text?: string;
      senderId?: string;
      senderName?: string;
      tenantId?: string;
      reply?: boolean;
    };
    const text = String(body.text || "").trim().slice(0, 2000);
    if (!text) {
      return NextResponse.json({ error: "text required." }, { status: 400 });
    }

    const tenantId = await resolvePublicTenantId(request, body.tenantId);
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
        tenantId,
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
