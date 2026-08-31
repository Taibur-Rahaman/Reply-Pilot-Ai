import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateEscalation } from "../src/lib/bot/handoff";
import {
  ungroundedFactualAsk,
  validateGroundedReply,
} from "../src/lib/bot/grounding";

describe("evaluateEscalation", () => {
  it("escalates refund language", () => {
    const r = evaluateEscalation("refund করে দিন");
    assert.equal(r.escalate, true);
    assert.equal(r.reason, "refund");
  });

  it("escalates an explicit human / manager request", () => {
    const r = evaluateEscalation("manager-এর সাথে কথা বলব");
    assert.equal(r.escalate, true);
    assert.equal(r.reason, "human_requested");
  });

  it("escalates unclear order disputes", () => {
    const r = evaluateEscalation("wrong item এসেছে, missing money");
    assert.equal(r.escalate, true);
    assert.equal(r.reason, "order_dispute");
  });

  it("escalates low confidence when below threshold", () => {
    const r = evaluateEscalation("hmm", { confidence: 0.4 });
    assert.equal(r.escalate, true);
    assert.equal(r.reason, "low_confidence");
  });

  it("does not escalate ordinary catalog questions", () => {
    const r = evaluateEscalation("Kurti dam koto?");
    assert.equal(r.escalate, false);
  });
});

describe("catalog grounding", () => {
  const ctx = {
    products: [{ name: "Kurti", price: 890, stock: 4 }],
    trackingNumbers: [] as string[],
    knowledge: "(No knowledge yet.)",
    userText: "এই পণ্যের দাম কত?",
  };

  it("refuses a price ask when the product is not in the catalog", () => {
    const refuse = ungroundedFactualAsk({
      ...ctx,
      userText: "এই পণ্যের দাম কত?",
    });
    assert.ok(refuse);
    assert.match(refuse!, /ক্যাটালগ|হিউম্যান/);
  });

  it("refuses a discount claim that is not in KB", () => {
    const refuse = ungroundedFactualAsk({
      ...ctx,
      userText: "৫০% discount আছে?",
    });
    assert.ok(refuse);
  });

  it("refuses tracking when no tracking number exists", () => {
    const refuse = ungroundedFactualAsk({
      ...ctx,
      userText: "আমার tracking number দিন",
    });
    assert.ok(refuse);
    assert.match(refuse!, /ট্র্যাকিং/);
  });

  it("strips invented catalog prices from an LLM reply", () => {
    const result = validateGroundedReply("এই জিনিস ৳99999", ctx);
    assert.equal(result.ok, false);
    assert.ok(result.violations.includes("invented_price"));
  });

  it("allows a catalog price that actually exists", () => {
    const result = validateGroundedReply("Kurti ৳890, stock 4", {
      ...ctx,
      userText: "Kurti dam koto?",
    });
    assert.equal(result.ok, true);
  });

  it("rejects invented refund outcomes", () => {
    const result = validateGroundedReply("Your refund has been processed", ctx);
    assert.equal(result.ok, false);
    assert.ok(result.violations.includes("invented_refund"));
  });
});
