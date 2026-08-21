/**
 * Cross-tenant isolation. Skips when DATABASE_URL is unset so unit CI
 * without Postgres still runs the rest of the suite.
 */
import assert from "node:assert/strict";
import { after, describe, it } from "node:test";

const hasDb = Boolean(process.env.DATABASE_URL?.trim());

describe("tenant isolation (postgres)", { skip: !hasDb }, () => {
  it("does not let tenant A read tenant B orders, leads, or conversations", async (t) => {
    const { prisma } = await import("../src/lib/db/prisma");
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      t.skip("PostgreSQL is not reachable");
      return;
    }
    const { getOrder, listLeads, listConversations, listProducts } =
      await import("../src/lib/db");

    const tenantA = `iso_a_${Date.now()}`;
    const tenantB = `iso_b_${Date.now()}`;
    await prisma.tenant.createMany({
      data: [
        { id: tenantA, name: "A", slug: tenantA },
        { id: tenantB, name: "B", slug: tenantB },
      ],
    });

    await prisma.product.create({
      data: {
        id: `p_${tenantB}`,
        tenantId: tenantB,
        name: "Secret SKU",
        price: 1,
      },
    });
    await prisma.lead.create({
      data: {
        id: `l_${tenantB}`,
        tenantId: tenantB,
        name: "B lead",
        phone: "01700000000",
        businessType: "x",
        interest: "y",
        source: "test",
      },
    });
    await prisma.order.create({
      data: {
        id: `o_${tenantB}`,
        tenantId: tenantB,
        senderId: "psid_b",
        name: "B",
        phone: "01700000000",
        product: "Secret SKU",
      },
    });
    await prisma.conversation.create({
      data: {
        id: `c_${tenantB}`,
        tenantId: tenantB,
        pageId: "page_b",
        senderId: "psid_b",
        channel: "messenger",
      },
    });

    try {
      assert.equal(await getOrder(tenantA, `o_${tenantB}`), null);
      const leads = await listLeads(tenantA);
      assert.equal(leads.some((l) => l.id === `l_${tenantB}`), false);
      const convos = await listConversations(tenantA);
      assert.equal(convos.some((c) => c.id === `c_${tenantB}`), false);
      const products = await listProducts(tenantA);
      assert.equal(products.some((p) => p.name === "Secret SKU"), false);
    } finally {
      await prisma.tenant.deleteMany({ where: { id: { in: [tenantA, tenantB] } } });
    }
  });
});

after(async () => {
  if (!hasDb) return;
  const { prisma } = await import("../src/lib/db/prisma");
  await prisma.$disconnect();
});
