import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * STUB ONLY — Comment auto-reply / spam delete.
 *
 * Requires Facebook Page permissions (pages_manage_engagement, pages_read_engagement,
 * and often App Review). Not wired to live Graph calls until tokens + review are ready.
 *
 * Documented for Phase 2+; returns capability checklist, does not delete or reply.
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    status: "stub",
    feature: "comment_auto_reply_and_spam_delete",
    live: false,
    required: [
      "Meta App with Page connected",
      "pages_manage_engagement / pages_read_engagement (App Review for production)",
      "Webhook field: feed (or comments) subscribed",
      "Spam heuristics + allowlist of keywords",
    ],
    plannedEndpoints: {
      "POST /api/comments/webhook": "Receive feed/comment webhooks (not implemented)",
      "POST /api/comments/reply": "Reply to a comment by id (not implemented)",
      "POST /api/comments/hide-or-delete": "Hide/delete spam (not implemented)",
    },
    message:
      "Comment automation is stubbed. Connect Messenger messages first; enable comments after Page permissions.",
  });
}

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      status: "stub",
      error:
        "Comment auto-reply / spam delete is not implemented yet. See GET /api/comments/stub for requirements.",
    },
    { status: 501 },
  );
}
