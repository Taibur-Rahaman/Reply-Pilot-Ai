/**
 * Telegram channel tests.
 *
 * Run with: npm test
 *
 * These cover the two places the Telegram integration can go wrong in ways that
 * are invisible in production:
 *
 *  - **Update parsing.** Telegram sends a dozen update shapes down one webhook.
 *    Mis-parsing one does not throw, it just silently answers the wrong thing —
 *    or, in the bot-echo case, answers itself in a paid loop.
 *  - **Per-tenant tokens.** Same class of bug as tests/multitenant.send.test.mts
 *    guards on the Meta side: a shared fallback token would post shop #1's
 *    replies from shop #2's bot.
 */

import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

process.env.SESSION_SECRET ||= "test-secret-that-is-long-enough-to-pass-32";
process.env.TOKEN_ENCRYPTION_KEY ||= "test-encryption-key-long-enough-to-hash";

const {
  normalizeTelegramUpdate,
  sendTelegramText,
  sendTelegramPhoto,
  sendTelegramTyping,
} = await import("../src/lib/bot/telegram");

type Captured = { url: string; body: unknown };

const realFetch = globalThis.fetch;

function captureFetch(): Captured[] {
  const calls: Captured[] = [];
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({
      url: String(input),
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    });
    return new Response(JSON.stringify({ ok: true, result: {} }), {
      status: 200,
    });
  }) as typeof fetch;
  return calls;
}

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe("normalizeTelegramUpdate", () => {
  it("reads a plain text message", () => {
    const inbound = normalizeTelegramUpdate({
      update_id: 1,
      message: {
        message_id: 42,
        date: 1700000000,
        chat: { id: 987654321, type: "private" },
        from: { id: 987654321, first_name: "Mahadi", last_name: "Hasan" },
        text: "dam koto?",
      },
    });

    assert.ok(inbound);
    assert.equal(inbound.senderId, "987654321");
    assert.equal(inbound.senderName, "Mahadi Hasan");
    assert.equal(inbound.text, "dam koto?");
    assert.equal(inbound.timestamp, 1700000000000);
  });

  it("scopes the dedupe id by chat", () => {
    // Telegram's message_id is unique per chat, not per bot. Without the chat
    // in the key, two buyers whose counters happen to line up would silence
    // each other via the pipeline's duplicate-mid check.
    const a = normalizeTelegramUpdate({
      message: { message_id: 7, chat: { id: 111 }, text: "hi" },
    });
    const b = normalizeTelegramUpdate({
      message: { message_id: 7, chat: { id: 222 }, text: "hi" },
    });
    assert.notEqual(a?.mid, b?.mid);
  });

  it("ignores messages authored by a bot", () => {
    // A bot answering its own output is an unbounded paid loop.
    const inbound = normalizeTelegramUpdate({
      message: {
        message_id: 1,
        chat: { id: 1 },
        from: { id: 2, is_bot: true, first_name: "SomeBot" },
        text: "hello",
      },
    });
    assert.equal(inbound, null);
  });

  it("takes the largest rendition of a photo", () => {
    const inbound = normalizeTelegramUpdate({
      message: {
        message_id: 5,
        chat: { id: 33 },
        photo: [
          { file_id: "small", file_size: 100 },
          { file_id: "medium", file_size: 900 },
          { file_id: "large", file_size: 9000 },
        ],
        caption: "eta ki?",
      },
    });
    assert.equal(inbound?.photoFileId, "large");
    assert.equal(inbound?.text, "eta ki?");
  });

  it("treats an inline button tap as typed text", () => {
    const inbound = normalizeTelegramUpdate({
      callback_query: {
        id: "cb1",
        data: "order_now",
        from: { id: 55, first_name: "Rina" },
        message: { message_id: 9, chat: { id: 55 } },
      },
    });
    assert.equal(inbound?.senderId, "55");
    assert.equal(inbound?.text, "order_now");
  });

  it("returns null for updates the agent has no answer for", () => {
    assert.equal(normalizeTelegramUpdate({ update_id: 1 }), null);
    assert.equal(normalizeTelegramUpdate({ channel_post: { text: "x" } }), null);
    assert.equal(
      normalizeTelegramUpdate({ message: { message_id: 1, chat: { id: 1 } } }),
      null,
      "a message with neither text nor photo is not answerable",
    );
    assert.equal(normalizeTelegramUpdate(null), null);
    assert.equal(normalizeTelegramUpdate("nonsense"), null);
  });

  it("survives a chat id of 0 rather than treating it as missing", () => {
    const inbound = normalizeTelegramUpdate({
      message: { message_id: 1, chat: { id: 0 }, text: "hi" },
    });
    assert.equal(inbound?.senderId, "0");
  });
});

describe("per-tenant Telegram bot tokens", () => {
  it("sends with the token it was given", async () => {
    const calls = captureFetch();

    await sendTelegramText("111", "shop A reply", "TOKEN_A");
    await sendTelegramText("222", "shop B reply", "TOKEN_B");

    assert.equal(calls.length, 2);
    assert.ok(calls[0].url.includes("/botTOKEN_A/sendMessage"));
    assert.ok(calls[1].url.includes("/botTOKEN_B/sendMessage"));
  });

  it("skips the send entirely rather than guessing a token", async () => {
    const calls = captureFetch();

    const text = await sendTelegramText("111", "hello", undefined);
    const photo = await sendTelegramPhoto("111", "https://x/y.jpg", undefined);
    await sendTelegramTyping("111", undefined);

    assert.equal(text.skipped, true);
    assert.equal(text.error, "missing_bot_token");
    assert.equal(photo.skipped, true);
    assert.equal(calls.length, 0, "must not call the Bot API without a token");
  });

  it("truncates to Telegram's message limit instead of being rejected", async () => {
    const calls = captureFetch();
    await sendTelegramText("111", "ক".repeat(9000), "TOKEN_A");
    const sent = (calls[0].body as { text: string }).text;
    assert.ok(sent.length <= 4096, `sent ${sent.length} chars`);
  });

  it("reports failure instead of throwing when Telegram rejects the send", async () => {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({ ok: false, description: "chat not found" }),
        { status: 400 },
      )) as typeof fetch;

    const result = await sendTelegramText("111", "hi", "TOKEN_A");
    assert.equal(result.ok, false);
    assert.match(result.error || "", /chat not found/);
  });

  it("reports failure instead of throwing when the network is down", async () => {
    globalThis.fetch = (async () => {
      throw new Error("ECONNREFUSED");
    }) as typeof fetch;

    // A throw here would fail the queue job and have the whole turn replayed,
    // which re-sends every reply the turn had already delivered.
    const result = await sendTelegramText("111", "hi", "TOKEN_A");
    assert.equal(result.ok, false);
  });
});
