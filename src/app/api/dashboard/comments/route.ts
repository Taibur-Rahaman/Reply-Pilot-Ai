import { NextResponse } from "next/server";
import {
  getCommentSettings,
  getSessionFromRequest,
  listCommentEvents,
  processComment,
  saveCommentSettings,
} from "@/lib/db";
import { denyUnless, MIN_ROLE } from "@/lib/rbac";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const [settings, events] = await Promise.all([
    getCommentSettings(session.tenantId),
    listCommentEvents(session.tenantId),
  ]);
  return NextResponse.json({ ok: true, settings, events });
}

export async function PUT(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const denied = denyUnless(session, MIN_ROLE.commentsWrite);
  if (denied) return denied;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const settings = await saveCommentSettings(session.tenantId, {
      autoReplyEnabled:
        typeof body.autoReplyEnabled === "boolean"
          ? body.autoReplyEnabled
          : undefined,
      autoReplyText:
        typeof body.autoReplyText === "string"
          ? body.autoReplyText
          : undefined,
      spamKeywords: Array.isArray(body.spamKeywords)
        ? body.spamKeywords.map(String)
        : typeof body.spamKeywords === "string"
          ? body.spamKeywords.split(",").map((s) => s.trim()).filter(Boolean)
          : undefined,
      leadCaptureEnabled:
        typeof body.leadCaptureEnabled === "boolean"
          ? body.leadCaptureEnabled
          : undefined,
    });
    return NextResponse.json({ ok: true, settings });
  } catch (error) {
    console.error("[api/dashboard/comments]", error);
    return NextResponse.json({ error: "Save failed." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  try {
    const body = (await request.json()) as {
      text?: string;
      authorName?: string;
      phone?: string;
    };
    if (!body.text?.trim()) {
      return NextResponse.json({ error: "text required." }, { status: 400 });
    }
    const result = await processComment({
      tenantId: session.tenantId,
      text: body.text.trim(),
      authorName: body.authorName,
      phone: body.phone,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[api/dashboard/comments]", error);
    return NextResponse.json({ error: "Process failed." }, { status: 500 });
  }
}
