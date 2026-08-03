import { createHmac, timingSafeEqual } from "crypto";
import { getMetaAppSecret, getPageAccessToken } from "./config";

const GRAPH = "https://graph.facebook.com/v21.0";

export type InboundMessage = {
  senderId: string;
  pageId?: string;
  mid?: string;
  text?: string;
  imageUrl?: string;
  isEcho?: boolean;
  timestamp?: number;
};

export type MessagingEvent = {
  sender?: { id?: string };
  recipient?: { id?: string };
  timestamp?: number;
  message?: {
    mid?: string;
    text?: string;
    is_echo?: boolean;
    attachments?: {
      type?: string;
      payload?: { url?: string };
    }[];
  };
  postback?: { payload?: string; title?: string };
};

export function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | null,
): boolean {
  const secret = getMetaAppSecret();
  if (!secret) {
    // Without app secret we cannot verify — allow only in development.
    return process.env.NODE_ENV !== "production";
  }
  if (!signatureHeader?.startsWith("sha256=")) {
    return false;
  }

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const received = signatureHeader.slice("sha256=".length);

  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(received, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function normalizeMessagingEvents(
  body: unknown,
): InboundMessage[] {
  if (!body || typeof body !== "object") return [];
  const payload = body as {
    object?: string;
    entry?: {
      id?: string;
      messaging?: MessagingEvent[];
    }[];
  };

  if (payload.object !== "page") return [];

  const out: InboundMessage[] = [];

  for (const entry of payload.entry ?? []) {
    for (const event of entry.messaging ?? []) {
      const isEcho = Boolean(event.message?.is_echo);
      // Echo: sender is the Page, recipient is the user — handoff keys off the user.
      const userId = isEcho ? event.recipient?.id : event.sender?.id;
      if (!userId) continue;

      const image =
        event.message?.attachments?.find((a) => a.type === "image")?.payload
          ?.url;

      const text =
        event.message?.text ||
        event.postback?.payload ||
        event.postback?.title ||
        undefined;

      out.push({
        senderId: userId,
        pageId: entry.id || (isEcho ? event.sender?.id : event.recipient?.id),
        mid: event.message?.mid,
        text,
        imageUrl: image,
        isEcho,
        timestamp: event.timestamp,
      });
    }
  }

  return out;
}

export async function sendTextMessage(
  recipientId: string,
  text: string,
  pageAccessToken?: string,
): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const token = pageAccessToken || getPageAccessToken();
  if (!token) {
    console.warn("[messenger] No META_PAGE_ACCESS_TOKEN — reply not sent.");
    return { ok: false, skipped: true, error: "missing_page_token" };
  }

  const response = await fetch(`${GRAPH}/me/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      recipient: { id: recipientId },
      messaging_type: "RESPONSE",
      message: { text: text.slice(0, 1900) },
    }),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => "");
    console.error("[messenger] send text failed", response.status, err.slice(0, 400));
    return { ok: false, error: err.slice(0, 200) };
  }

  return { ok: true };
}

export async function sendImageMessage(
  recipientId: string,
  imageUrl: string,
  pageAccessToken?: string,
): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const token = pageAccessToken || getPageAccessToken();
  if (!token) {
    return { ok: false, skipped: true, error: "missing_page_token" };
  }

  const response = await fetch(`${GRAPH}/me/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      recipient: { id: recipientId },
      messaging_type: "RESPONSE",
      message: {
        attachment: {
          type: "image",
          payload: { url: imageUrl, is_reusable: true },
        },
      },
    }),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => "");
    console.error("[messenger] send image failed", response.status, err.slice(0, 400));
    return { ok: false, error: err.slice(0, 200) };
  }

  return { ok: true };
}
