import { NextResponse, after } from "next/server";
import { getMetaVerifyToken } from "@/lib/bot/config";
import {
  normalizeMessagingEvents,
  verifyMetaSignature,
} from "@/lib/bot/messenger";
import { handleInboundMessage } from "@/lib/bot/pipeline";

export const runtime = "nodejs";

/**
 * Meta webhook verification (GET).
 * Query: hub.mode, hub.verify_token, hub.challenge
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const expected = getMetaVerifyToken();

  if (!expected) {
    return NextResponse.json(
      {
        ok: false,
        error: "META_VERIFY_TOKEN is not set",
        hint: "Copy .env.example → .env.local, set META_VERIFY_TOKEN to a long random string, restart the server, then use the same value as Verify Token in Meta → Messenger → Webhooks.",
        docs: "See README § Environment variables and docs/QA-REPORT.md Meta webhook steps.",
      },
      { status: 503 },
    );
  }

  if (mode === "subscribe" && token === expected && challenge) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  return NextResponse.json(
    {
      ok: false,
      error: "Verification failed",
      hint:
        mode !== "subscribe"
          ? "hub.mode must be subscribe"
          : !token
            ? "hub.verify_token query param is missing"
            : token !== expected
              ? "hub.verify_token does not match META_VERIFY_TOKEN"
              : "hub.challenge is missing",
    },
    { status: 403 },
  );
}

/**
 * Inbound Messenger events (POST).
 * Signature is checked synchronously; pipeline runs in after() so Meta gets
 * a fast 200 and does not retry on LLM latency.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  if (!verifyMetaSignature(rawBody, signature)) {
    const hasSecret = Boolean(process.env.META_APP_SECRET?.trim());
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid signature.",
        hint: hasSecret
          ? "X-Hub-Signature-256 does not match META_APP_SECRET. Confirm the App Secret and that Meta is posting to this URL."
          : "META_APP_SECRET is not set. In production, signature verification is required. Locally (NODE_ENV≠production) unsigned POSTs are allowed for demo ingest.",
      },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const events = normalizeMessagingEvents(body);

  after(async () => {
    for (const event of events) {
      try {
        await handleInboundMessage(event);
      } catch (error) {
        console.error("[webhook] handle error:", error);
      }
    }
  });

  return NextResponse.json({ ok: true, received: events.length });
}
