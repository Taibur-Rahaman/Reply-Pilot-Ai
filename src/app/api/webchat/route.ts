import { NextResponse } from "next/server";
import { handleInboundMessage } from "@/lib/bot/pipeline";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { resolvePublicTenantId } from "@/lib/tenant-scope";

export const runtime = "nodejs";

/**
 * Public website chat widget endpoint.
 * Same Sales pipeline as Messenger (guardrails, handoff, grounding).
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
    const senderId =
      body.senderId?.trim() ||
      `web_${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;

    const result = await handleInboundMessage({
      senderId,
      pageId: "web_widget",
      text,
      tenantId,
      channel: "web",
    });

    return NextResponse.json({
      ok: true,
      channel: "web",
      conversationId: result.conversationId,
      senderId,
      reply: body.reply === false ? undefined : result.replyPreview,
      reason: result.reason,
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
