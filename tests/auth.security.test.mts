/**
 * Regression tests for authentication and tenant-scoping.
 *
 * Run with: npm test
 *
 * Each case here maps to a real vulnerability that existed in this codebase.
 * If one of these fails, treat it as a production security incident, not a
 * flaky test.
 */

import assert from "node:assert/strict";
import { after, describe, it } from "node:test";

process.env.SESSION_SECRET ||= "test-secret-that-is-long-enough-to-pass-32";

const { decodeSession, encodeSession, getSessionFromRequest, verifyPassword } =
  await import("../src/lib/db/auth");
const { resolvePublicTenantId } = await import("../src/lib/tenant-scope");
const { DEFAULT_TENANT_ID } = await import("../src/lib/db/types");

function base64urlJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

describe("decodeSession", () => {
  it("rejects an unsigned base64 JSON token (privilege-escalation bypass)", async () => {
    const forged = base64urlJson({
      userId: "attacker",
      tenantId: "victim-tenant",
      email: "attacker@evil.com",
      name: "Attacker",
      role: "admin",
    });
    assert.equal(await decodeSession(forged), null);
  });

  it("rejects a token signed with the wrong secret", async () => {
    const real = await encodeSession({
      userId: "u1",
      tenantId: "t1",
      email: "a@b.c",
      name: "A",
      role: "admin",
    });
    // Flip a character in the signature segment.
    //
    // Must be the FIRST character, not the last: a 32-byte HMAC encodes to 43
    // base64url characters, so the final one carries only 4 significant bits
    // plus 2 bits of padding. Several characters there decode to the same byte,
    // so tampering with it left the signature valid roughly a quarter of the
    // time and this test failed at random.
    const [h, p, s] = real.split(".");
    const tampered = `${h}.${p}.${s.at(0) === "A" ? "B" : "A"}${s.slice(1)}`;
    assert.notEqual(tampered, real, "tampering must actually change the token");
    assert.equal(await decodeSession(tampered), null);
  });

  it("rejects a token whose payload claims an unknown role", async () => {
    const { SignJWT } = await import("jose");
    const token = await new SignJWT({
      userId: "u1",
      tenantId: "t1",
      role: "superadmin",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(new TextEncoder().encode(process.env.SESSION_SECRET!.padEnd(32, "0")));
    assert.equal(await decodeSession(token), null);
  });

  it("accepts a genuinely signed session", async () => {
    const token = await encodeSession({
      userId: "u1",
      tenantId: "t1",
      email: "a@b.c",
      name: "A",
      role: "manager",
    });
    const session = await decodeSession(token);
    assert.equal(session?.userId, "u1");
    assert.equal(session?.role, "manager");
  });

  it("returns null for empty/garbage input", async () => {
    assert.equal(await decodeSession(undefined), null);
    assert.equal(await decodeSession(""), null);
    assert.equal(await decodeSession("not-a-token"), null);
  });
});

describe("resolveTenantIdForPage", () => {
  it("does not fall back to the demo tenant when pageId is missing", async () => {
    const { resolveTenantIdForPage } = await import("../src/lib/db/auth");
    assert.equal(await resolveTenantIdForPage(undefined), null);
    assert.equal(await resolveTenantIdForPage(""), null);
  });
});

describe("getSessionFromRequest", () => {
  it("ignores x-admin-password (no header session injection)", async () => {
    process.env.ADMIN_PASSWORD = "super-secret-admin";
    const request = new Request("https://example.com", {
      headers: { "x-admin-password": "super-secret-admin" },
    });
    assert.equal(await getSessionFromRequest(request), null);
    delete process.env.ADMIN_PASSWORD;
  });

  it("ignores the x-facetai-session header", async () => {
    const token = await encodeSession({
      userId: "u1",
      tenantId: "t1",
      email: "a@b.c",
      name: "A",
      role: "admin",
    });
    const request = new Request("https://example.com", {
      headers: { "x-facetai-session": token },
    });
    assert.equal(await getSessionFromRequest(request), null);
  });

  it("reads a session from the cookie", async () => {
    const token = await encodeSession({
      userId: "u1",
      tenantId: "t1",
      email: "a@b.c",
      name: "A",
      role: "admin",
    });
    const request = new Request("https://example.com", {
      headers: { cookie: `facetai_session=${encodeURIComponent(token)}` },
    });
    assert.equal((await getSessionFromRequest(request))?.userId, "u1");
  });
});

describe("verifyPassword", () => {
  it("never treats a stored plaintext value as a valid password", async () => {
    assert.equal(await verifyPassword("hunter2", "hunter2"), false);
  });

  it("rejects an empty hash", async () => {
    assert.equal(await verifyPassword("anything", ""), false);
  });

  it("accepts a matching bcrypt hash", async () => {
    const { hashPassword } = await import("../src/lib/db/auth");
    const hash = await hashPassword("correct-horse");
    assert.equal(await verifyPassword("correct-horse", hash), true);
    assert.equal(await verifyPassword("wrong", hash), false);
  });
});

describe("resolvePublicTenantId", () => {
  const anon = () => new Request("https://example.com", { method: "POST" });

  it("defaults to the public tenant when none is requested", async () => {
    assert.equal(await resolvePublicTenantId(anon()), DEFAULT_TENANT_ID);
  });

  it("refuses to let an anonymous caller address another tenant", async () => {
    assert.equal(
      await resolvePublicTenantId(anon(), "someone-elses-tenant"),
      DEFAULT_TENANT_ID,
    );
  });

  it("allows a caller to address the tenant their session belongs to", async () => {
    const token = await encodeSession({
      userId: "u1",
      tenantId: "tenant-a",
      email: "a@b.c",
      name: "A",
      role: "admin",
    });
    const request = new Request("https://example.com", {
      method: "POST",
      headers: { cookie: `facetai_session=${encodeURIComponent(token)}` },
    });
    assert.equal(await resolvePublicTenantId(request, "tenant-a"), "tenant-a");
  });

  it("refuses a session-holder addressing a different tenant", async () => {
    const token = await encodeSession({
      userId: "u1",
      tenantId: "tenant-a",
      email: "a@b.c",
      name: "A",
      role: "admin",
    });
    const request = new Request("https://example.com", {
      method: "POST",
      headers: { cookie: `facetai_session=${encodeURIComponent(token)}` },
    });
    assert.equal(
      await resolvePublicTenantId(request, "tenant-b"),
      DEFAULT_TENANT_ID,
    );
  });
});

after(async () => {
  // Prisma opens a connection pool on import; close it so the runner exits.
  const { prisma } = await import("../src/lib/db/prisma");
  await prisma.$disconnect();
});
