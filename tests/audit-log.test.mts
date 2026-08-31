import "./load-env.mts";
/**
 * Audit rows must actually land in Postgres.
 * Login failure is currently not written (AuditLog requires a tenant FK).
 */
import assert from "node:assert/strict";
import { after, describe, it } from "node:test";

const hasDb = Boolean(process.env.DATABASE_URL?.trim());

describe("audit log (postgres)", { skip: !hasDb }, () => {
  it("writes login success and a security-sensitive admin action", async () => {
    const { prisma } = await import("../src/lib/db/prisma");
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new Error(
        "PostgreSQL is required for audit verification and was not reachable",
      );
    }

    const { hashPassword } = await import("../src/lib/db/auth");
    const { listAuditLogs, saveBotConfig } = await import("../src/lib/db");
    const { POST: login } = await import("../src/app/api/auth/login/route");

    const tenantId = `audit_${Date.now()}`;
    const email = `admin-${tenantId}@audit.test`;
    const password = "audit-pass-ok";

    await prisma.tenant.create({
      data: { id: tenantId, name: "Audit", slug: tenantId },
    });
    await prisma.user.create({
      data: {
        id: `user_${tenantId}`,
        tenantId,
        email,
        name: "Audit Admin",
        role: "admin",
        passwordHash: await hashPassword(password),
      },
    });

    try {
      const failed = await login(
        new Request("http://localhost/api/auth/login", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email, password: "wrong-password" }),
        }),
      );
      assert.equal(failed.status, 401);

      const afterFail = await listAuditLogs(tenantId, 50);
      assert.equal(
        afterFail.some((row) => row.action === "auth.login_failure"),
        false,
        "login failure is not persisted (no tenant-less audit row)",
      );

      const ok = await login(
        new Request("http://localhost/api/auth/login", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email, password, tenantSlug: tenantId }),
        }),
      );
      assert.equal(ok.status, 200);

      const afterLogin = await listAuditLogs(tenantId, 50);
      assert.equal(
        afterLogin.some((row) => row.action === "auth.login_success"),
        true,
      );

      await saveBotConfig(
        tenantId,
        { businessName: "Audit Shop" },
        { userId: `user_${tenantId}`, email },
      );
      const afterAdmin = await listAuditLogs(tenantId, 50);
      assert.equal(
        afterAdmin.some((row) => row.action === "config.bot_update"),
        true,
        `expected config.bot_update, got ${afterAdmin.map((r) => r.action).join(",")}`,
      );
    } finally {
      await prisma.tenant.deleteMany({ where: { id: tenantId } });
    }
  });
});

after(async () => {
  if (!hasDb) return;
  const { prisma } = await import("../src/lib/db/prisma");
  await prisma.$disconnect();
});
