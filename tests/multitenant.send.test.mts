/**
 * Regression tests for per-tenant Messenger sending.
 *
 * Run with: npm test
 *
 * The bug these exist for: `sendTextMessage` accepts an optional page token, but
 * every call site in the reply pipeline used to omit it, so all tenants fell
 * back to one global `META_PAGE_ACCESS_TOKEN`. Business #1 worked; business #2
 * either got silence or was answered from business #1's Page.
 *
 * If one of these fails, the product cannot have a second customer. Treat it as
 * a release blocker, not a flaky test.
 */

import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

process.env.SESSION_SECRET ||= "test-secret-that-is-long-enough-to-pass-32";
process.env.TOKEN_ENCRYPTION_KEY ||= "test-encryption-key-long-enough-to-hash";

const { sendTextMessage, sendImageMessage, sendTypingOn } = await import(
  "../src/lib/bot/messenger"
);
const { encryptSecret, decryptSecret, isEncrypted } = await import(
  "../src/lib/crypto"
);

type Captured = { url: string; auth: string | null; body: unknown };

const realFetch = globalThis.fetch;

/** Swap in a fetch that records the Graph call instead of making it. */
function captureFetch(): Captured[] {
  const calls: Captured[] = [];
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    calls.push({
      url: String(input),
      auth: headers.get("Authorization"),
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    });
    return new Response(JSON.stringify({ message_id: "m_1" }), { status: 200 });
  }) as typeof fetch;
  return calls;
}

afterEach(() => {
  globalThis.fetch = realFetch;
  delete process.env.META_PAGE_ACCESS_TOKEN;
});

describe("per-tenant Page tokens", () => {
  it("sends with the token it was given, not the global env token", async () => {
    process.env.META_PAGE_ACCESS_TOKEN = "GLOBAL_WRONG_TENANT_TOKEN";
    const calls = captureFetch();

    await sendTextMessage("psid_a", "hello A", "TENANT_A_TOKEN");
    await sendTextMessage("psid_b", "hello B", "TENANT_B_TOKEN");

    assert.equal(calls.length, 2);
    assert.equal(calls[0].auth, "Bearer TENANT_A_TOKEN");
    assert.equal(calls[1].auth, "Bearer TENANT_B_TOKEN");
    // The whole point: neither reply may go out on the shared credential.
    for (const call of calls) {
      assert.notEqual(call.auth, "Bearer GLOBAL_WRONG_TENANT_TOKEN");
    }
  });

  it("keeps each tenant's recipient bound to that tenant's token", async () => {
    const calls = captureFetch();

    await sendTextMessage("buyer_of_shop_a", "৳৫০০", "SHOP_A_TOKEN");
    await sendTextMessage("buyer_of_shop_b", "৳৯০০", "SHOP_B_TOKEN");

    const byRecipient = new Map(
      calls.map((c) => [
        (c.body as { recipient: { id: string } }).recipient.id,
        c.auth,
      ]),
    );
    assert.equal(byRecipient.get("buyer_of_shop_a"), "Bearer SHOP_A_TOKEN");
    assert.equal(byRecipient.get("buyer_of_shop_b"), "Bearer SHOP_B_TOKEN");
  });

  it("applies the same rule to images and typing indicators", async () => {
    process.env.META_PAGE_ACCESS_TOKEN = "GLOBAL_WRONG_TENANT_TOKEN";
    const calls = captureFetch();

    await sendImageMessage("psid_a", "https://example.com/x.jpg", "TENANT_A_TOKEN");
    await sendTypingOn("psid_a", "TENANT_A_TOKEN");

    assert.equal(calls.length, 2);
    for (const call of calls) {
      assert.equal(call.auth, "Bearer TENANT_A_TOKEN");
    }
  });

  it("skips the send entirely rather than guessing a token", async () => {
    const calls = captureFetch();
    const result = await sendTextMessage("psid_a", "hello", undefined);

    assert.equal(result.skipped, true);
    assert.equal(result.error, "missing_page_token");
    assert.equal(calls.length, 0, "must not call Graph without a token");
  });
});

describe("page token encryption at rest", () => {
  it("round-trips a token", () => {
    const token = "EAAG_a_real_looking_page_token_value";
    const stored = encryptSecret(token);
    assert.notEqual(stored, token, "must not store the token in plaintext");
    assert.ok(isEncrypted(stored));
    assert.equal(decryptSecret(stored), token);
  });

  it("produces a different ciphertext each time (random IV)", () => {
    const a = encryptSecret("same-token");
    const b = encryptSecret("same-token");
    assert.notEqual(a, b);
    assert.equal(decryptSecret(a), decryptSecret(b));
  });

  it("still reads rows written before encryption existed", () => {
    // Legacy plaintext must keep working until the re-encrypt script has run,
    // otherwise enabling encryption silently breaks every connected Page.
    assert.equal(decryptSecret("legacy_plaintext_token"), "legacy_plaintext_token");
  });

  it("returns undefined rather than a corrupt token when the value is tampered with", () => {
    const stored = encryptSecret("real-token");
    const parts = stored.split(".");
    // Corrupt the ciphertext segment; GCM's auth tag should reject it.
    parts[3] = Buffer.from("tampered-value").toString("base64");
    assert.equal(decryptSecret(parts.join(".")), undefined);
  });
});
