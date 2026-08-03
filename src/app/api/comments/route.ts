import { NextResponse } from "next/server";
import {
  DEFAULT_TENANT_ID,
  getCommentSettings,
  processComment,
} from "@/lib/db";

export const runtime = "nodejs";

/**
 * Facebook Comment AI — upgraded beyond stub.
 * Live Graph delete/reply still requires Page tokens + App Review.
 * This endpoint runs spam keyword detection, auto-reply text, and lead capture.
 */
export async function GET() {
  const settings = await getCommentSettings(DEFAULT_TENANT_ID);
  return NextResponse.json({
    ok: true,
    status: "partial",
    feature: "comment_auto_reply_spam_lead_capture",
    liveGraph: false,
    settings: {
      autoReplyEnabled: settings.autoReplyEnabled,
      spamKeywordCount: settings.spamKeywords.length,
      leadCaptureEnabled: settings.leadCaptureEnabled,
    },
    endpoints: {
      "POST /api/comments": "Process a comment (spam flag + auto-reply + lead)",
      "GET/PUT /api/dashboard/comments": "Dashboard settings + event log",
    },
    requiredForLiveMeta: [
      "pages_manage_engagement / pages_read_engagement (App Review)",
      "Webhook field: feed subscribed",
      "Page access token",
    ],
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      text?: string;
      authorName?: string;
      commentId?: string;
      postId?: string;
      phone?: string;
      tenantId?: string;
    };
    if (!body.text?.trim()) {
      return NextResponse.json({ error: "text required." }, { status: 400 });
    }
    const result = await processComment({
      tenantId: body.tenantId || DEFAULT_TENANT_ID,
      text: body.text.trim(),
      authorName: body.authorName,
      commentId: body.commentId,
      postId: body.postId,
      phone: body.phone,
    });
    return NextResponse.json({
      ok: true,
      liveGraph: false,
      spamAction: result.spam ? "flagged_for_delete_when_token_ready" : null,
      autoReply: result.autoReplied
        ? {
            wouldSend: true,
            text: result.event.replyText,
            note: "Stored; Meta Graph send when Page token + permissions ready.",
          }
        : null,
      leadId: result.leadId,
      event: result.event,
    });
  } catch (error) {
    console.error("[api/comments]", error);
    return NextResponse.json({ error: "Process failed." }, { status: 500 });
  }
}
