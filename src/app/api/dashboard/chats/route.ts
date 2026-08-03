import { NextResponse } from "next/server";
import {
  CHANNELS,
  addConversationNote,
  getConversation,
  getSessionFromRequest,
  getUnifiedCustomerTimeline,
  ingestChannelMessage,
  listConversations,
  listMessages,
  requireMinRole,
  setConversationHandoffById,
  type Channel,
} from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const url = new URL(request.url);
  const conversationId = url.searchParams.get("conversationId");
  const channel = url.searchParams.get("channel") as Channel | "all" | null;
  const timeline = url.searchParams.get("timeline");

  if (conversationId && timeline === "1") {
    const convo = await getConversation(session.tenantId, conversationId);
    if (!convo) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    const events = await getUnifiedCustomerTimeline(
      session.tenantId,
      convo.senderId,
    );
    return NextResponse.json({
      ok: true,
      timeline: events,
      conversation: convo,
    });
  }

  if (conversationId) {
    const messages = await listMessages(session.tenantId, conversationId);
    const conversation = await getConversation(
      session.tenantId,
      conversationId,
    );
    return NextResponse.json({ ok: true, messages, conversation });
  }

  const conversations = await listConversations(
    session.tenantId,
    channel || "all",
  );
  return NextResponse.json({
    ok: true,
    conversations,
    channels: CHANNELS,
  });
}

export async function POST(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  try {
    const body = (await request.json()) as {
      channel?: Channel;
      senderId?: string;
      senderName?: string;
      text?: string;
    };
    if (!body.channel || !CHANNELS.includes(body.channel)) {
      return NextResponse.json(
        { error: "Valid channel required." },
        { status: 400 },
      );
    }
    if (!body.text?.trim()) {
      return NextResponse.json({ error: "text required." }, { status: 400 });
    }
    const result = await ingestChannelMessage({
      tenantId: session.tenantId,
      channel: body.channel,
      senderId: body.senderId || `${body.channel}_demo_${Date.now()}`,
      senderName: body.senderName || `${body.channel} demo`,
      text: body.text.trim(),
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[api/dashboard/chats]", error);
    return NextResponse.json({ error: "Ingest failed." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const forbidden = requireMinRole(session, "agent");
  if (forbidden) return forbidden;

  try {
    const body = (await request.json()) as {
      conversationId?: string;
      action?: "take" | "leave" | "note";
      note?: string;
    };
    if (!body.conversationId) {
      return NextResponse.json(
        { error: "conversationId required." },
        { status: 400 },
      );
    }

    if (body.action === "note") {
      if (!body.note?.trim()) {
        return NextResponse.json({ error: "note required." }, { status: 400 });
      }
      await addConversationNote(
        session.tenantId,
        body.conversationId,
        body.note,
        { userId: session.userId, email: session.email },
      );
      return NextResponse.json({ ok: true });
    }

    if (body.action === "take" || body.action === "leave") {
      const conversation = await setConversationHandoffById(
        session.tenantId,
        body.conversationId,
        body.action === "take",
        {
          assignedUserId: body.action === "take" ? session.userId : null,
          actorId: session.userId,
          actorEmail: session.email,
          note: body.note,
        },
      );
      if (!conversation) {
        return NextResponse.json({ error: "Not found." }, { status: 404 });
      }
      return NextResponse.json({ ok: true, conversation });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (error) {
    console.error("[api/dashboard/chats PATCH]", error);
    return NextResponse.json({ error: "Update failed." }, { status: 500 });
  }
}
