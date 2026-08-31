import assert from "node:assert/strict";
import { createHmac } from "crypto";
import { describe, it } from "node:test";
import {
  normalizeMessagingEvents,
  verifyMetaSignature,
} from "../src/lib/bot/messenger";

describe("Messenger signature verification", () => {
  it("rejects a missing signature when META_APP_SECRET is set", () => {
    process.env.META_APP_SECRET = "app-secret";
    assert.equal(verifyMetaSignature("{}", null), false);
    delete process.env.META_APP_SECRET;
  });

  it("accepts a valid X-Hub-Signature-256", () => {
    process.env.META_APP_SECRET = "app-secret";
    const raw = `{"object":"page"}`;
    const hex = createHmac("sha256", "app-secret").update(raw).digest("hex");
    assert.equal(verifyMetaSignature(raw, `sha256=${hex}`), true);
    delete process.env.META_APP_SECRET;
  });

  it("rejects a tampered signature", () => {
    process.env.META_APP_SECRET = "app-secret";
    const raw = `{"object":"page"}`;
    const hex = createHmac("sha256", "wrong").update(raw).digest("hex");
    assert.equal(verifyMetaSignature(raw, `sha256=${hex}`), false);
    delete process.env.META_APP_SECRET;
  });
});

describe("Messenger event normalize", () => {
  it("maps echo events so the user id is the recipient", () => {
    const events = normalizeMessagingEvents({
      object: "page",
      entry: [
        {
          id: "PAGE_1",
          messaging: [
            {
              sender: { id: "PAGE_1" },
              recipient: { id: "USER_9" },
              timestamp: 1,
              message: { mid: "m_echo", text: "human reply", is_echo: true },
            },
          ],
        },
      ],
    });
    assert.equal(events.length, 1);
    assert.equal(events[0].isEcho, true);
    assert.equal(events[0].senderId, "USER_9");
    assert.equal(events[0].pageId, "PAGE_1");
    assert.equal(events[0].mid, "m_echo");
  });
});
