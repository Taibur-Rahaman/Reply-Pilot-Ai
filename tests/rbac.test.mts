import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hasMinRole, MIN_ROLE } from "../src/lib/rbac";
import type { SessionPayload } from "../src/lib/db/auth";

function session(role: SessionPayload["role"]): SessionPayload {
  return {
    userId: "u1",
    tenantId: "t1",
    email: "a@b.c",
    name: "A",
    role,
  };
}

describe("RBAC policy", () => {
  it("lets an agent work the inbox and orders, not the catalog", () => {
    const agent = session("agent");
    assert.equal(hasMinRole(agent, MIN_ROLE.inbox), true);
    assert.equal(hasMinRole(agent, MIN_ROLE.orders), true);
    assert.equal(hasMinRole(agent, MIN_ROLE.catalogWrite), false);
    assert.equal(hasMinRole(agent, MIN_ROLE.knowledgeWrite), false);
    assert.equal(hasMinRole(agent, MIN_ROLE.teamWrite), false);
    assert.equal(hasMinRole(agent, MIN_ROLE.ecommerceWrite), false);
  });

  it("lets a manager mutate catalog and team", () => {
    const manager = session("manager");
    assert.equal(hasMinRole(manager, MIN_ROLE.catalogWrite), true);
    assert.equal(hasMinRole(manager, MIN_ROLE.teamWrite), true);
  });

  it("keeps moderator below config writes", () => {
    const mod = session("moderator");
    assert.equal(hasMinRole(mod, MIN_ROLE.complaints), true);
    assert.equal(hasMinRole(mod, MIN_ROLE.configWrite), false);
  });
});
