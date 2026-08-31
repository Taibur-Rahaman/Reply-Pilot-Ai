import "./load-env.mts";
/**
 * Cross-tenant isolation against real PostgreSQL.
 *
 * Skips the suite only when DATABASE_URL is unset (unit CI without a database).
 * If DATABASE_URL is set but Postgres is unreachable, this fails — it must
 * not silently skip.
 */
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

const hasDb = Boolean(process.env.DATABASE_URL?.trim());

type IsolationIds = {
  tenantA: string;
  tenantB: string;
  orderB: string;
  leadB: string;
  convoB: string;
  messageB: string;
  productB: string;
  kbB: string;
  complaintB: string;
};

async function cookieRequest(
  session: {
    userId: string;
    tenantId: string;
    email: string;
    name: string;
    role: "admin" | "manager" | "moderator" | "agent";
  },
  url: string,
  init?: RequestInit,
): Promise<Request> {
  const { encodeSession } = await import("../src/lib/db/auth");
  const token = await encodeSession(session);
  const headers = new Headers(init?.headers);
  headers.set("cookie", `facetai_session=${encodeURIComponent(token)}`);
  if (init?.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  return new Request(url, { ...init, headers });
}

describe("tenant isolation (postgres)", { skip: !hasDb }, () => {
  const ids: IsolationIds = {
    tenantA: "",
    tenantB: "",
    orderB: "",
    leadB: "",
    convoB: "",
    messageB: "",
    productB: "",
    kbB: "",
    complaintB: "",
  };
  const prevSuper = process.env.SUPER_ADMIN_EMAIL;
  const secretKb = "TENANT_B_SECRET_FORMULA_ZXQ_99";

  before(async () => {
    const { prisma } = await import("../src/lib/db/prisma");
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (error) {
      throw new Error(
        "PostgreSQL is required for tenant isolation and was not reachable",
        { cause: error },
      );
    }

    process.env.SUPER_ADMIN_EMAIL = "ops-superadmin@replypilot.test";
    const stamp = Date.now();
    ids.tenantA = `iso_a_${stamp}`;
    ids.tenantB = `iso_b_${stamp}`;
    ids.orderB = `o_${ids.tenantB}`;
    ids.leadB = `l_${ids.tenantB}`;
    ids.convoB = `c_${ids.tenantB}`;
    ids.messageB = `m_${ids.tenantB}`;
    ids.productB = `p_${ids.tenantB}`;
    ids.kbB = `kb_${ids.tenantB}`;
    ids.complaintB = `cmp_${ids.tenantB}`;

    await prisma.tenant.createMany({
      data: [
        { id: ids.tenantA, name: "A", slug: ids.tenantA },
        { id: ids.tenantB, name: "B", slug: ids.tenantB },
      ],
    });

    await prisma.product.create({
      data: {
        id: ids.productB,
        tenantId: ids.tenantB,
        name: "Secret SKU",
        price: 1,
      },
    });
    await prisma.lead.create({
      data: {
        id: ids.leadB,
        tenantId: ids.tenantB,
        name: "B lead",
        phone: "01700000000",
        businessType: "x",
        interest: "y",
        source: "test",
      },
    });
    await prisma.order.create({
      data: {
        id: ids.orderB,
        tenantId: ids.tenantB,
        senderId: "psid_b",
        name: "B",
        phone: "01700000000",
        product: "Secret SKU",
        trackingStatus: "new",
      },
    });
    await prisma.conversation.create({
      data: {
        id: ids.convoB,
        tenantId: ids.tenantB,
        pageId: "page_b",
        senderId: "psid_b",
        channel: "messenger",
      },
    });
    await prisma.message.create({
      data: {
        id: ids.messageB,
        tenantId: ids.tenantB,
        conversationId: ids.convoB,
        direction: "inbound",
        text: "Tenant B private message",
        mid: `mid_${ids.tenantB}`,
      },
    });
    await prisma.kbDocument.create({
      data: {
        id: ids.kbB,
        tenantId: ids.tenantB,
        filename: "secret.txt",
        mimeType: "text/plain",
        source: "manual",
        extractedText: secretKb,
        fileContent: Buffer.from(secretKb, "utf8"),
        status: "ready",
      },
    });
    await prisma.kbChunk.create({
      data: {
        id: `chunk_${ids.tenantB}`,
        tenantId: ids.tenantB,
        documentId: ids.kbB,
        content: secretKb,
        chunkIndex: 0,
      },
    });
    await prisma.complaint.create({
      data: {
        id: ids.complaintB,
        tenantId: ids.tenantB,
        conversationId: ids.convoB,
        senderId: "psid_b",
        text: "B complaint secret",
        priority: "high",
        status: "open",
      },
    });
  });

  after(async () => {
    if (prevSuper === undefined) delete process.env.SUPER_ADMIN_EMAIL;
    else process.env.SUPER_ADMIN_EMAIL = prevSuper;
    if (!ids.tenantA) return;
    const { prisma } = await import("../src/lib/db/prisma");
    await prisma.tenant.deleteMany({
      where: { id: { in: [ids.tenantA, ids.tenantB] } },
    });
  });

  it("does not let tenant A read tenant B leads, conversations, messages, orders, catalog, KB, or analytics", async () => {
    const {
      getOrder,
      listLeads,
      listConversations,
      listMessages,
      listProducts,
      listKbDocuments,
      listComplaints,
      getAnalyticsSummary,
      retrieveKnowledge,
      getConversation,
    } = await import("../src/lib/db");

    assert.equal(await getOrder(ids.tenantA, ids.orderB), null);
    assert.equal(
      (await listLeads(ids.tenantA)).some((l) => l.id === ids.leadB),
      false,
    );
    const convos = await listConversations(ids.tenantA);
    assert.equal(convos.some((c) => c.id === ids.convoB), false);
    assert.equal(
      convos.some((c) => (c.preview || "").includes("Tenant B private")),
      false,
    );
    assert.equal(await getConversation(ids.tenantA, ids.convoB), null);
    assert.equal((await listMessages(ids.tenantA, ids.convoB)).length, 0);
    assert.equal(
      (await listProducts(ids.tenantA)).some((p) => p.name === "Secret SKU"),
      false,
    );
    assert.equal(
      (await listKbDocuments(ids.tenantA)).some((d) => d.id === ids.kbB),
      false,
    );
    const kb = await retrieveKnowledge(ids.tenantA, secretKb, 5);
    assert.equal(kb.includes(secretKb), false);
    assert.equal(
      (await listComplaints(ids.tenantA)).some((c) => c.id === ids.complaintB),
      false,
    );

    const analyticsA = await getAnalyticsSummary(ids.tenantA);
    const analyticsB = await getAnalyticsSummary(ids.tenantB);
    assert.equal(analyticsA.orders, 0);
    assert.equal(analyticsA.leads, 0);
    assert.equal(analyticsA.conversations, 0);
    assert.equal(analyticsA.products, 0);
    assert.ok(analyticsB.orders >= 1);
    assert.ok(analyticsB.leads >= 1);
    assert.ok(analyticsB.conversations >= 1);
    assert.ok(analyticsB.products >= 1);
  });

  it("does not let tenant A mutate tenant B resources", async () => {
    const {
      updateOrderTracking,
      updateLeadStage,
      updateProduct,
      deleteProduct,
      deleteKbDocument,
      updateComplaint,
      setConversationHandoffById,
      getOrder,
      listLeads,
      listProducts,
      listKbDocuments,
      listComplaints,
      getConversation,
    } = await import("../src/lib/db");

    assert.equal(
      await updateOrderTracking(ids.tenantA, ids.orderB, "cancelled"),
      null,
    );
    assert.equal((await getOrder(ids.tenantB, ids.orderB))?.trackingStatus, "new");

    assert.equal(await updateLeadStage(ids.tenantA, ids.leadB, "won"), null);
    assert.equal(
      (await listLeads(ids.tenantB)).find((l) => l.id === ids.leadB)?.crmStage,
      "new",
    );

    assert.equal(
      await updateProduct(ids.tenantA, ids.productB, { name: "Hijacked" }),
      null,
    );
    assert.equal(await deleteProduct(ids.tenantA, ids.productB), false);
    assert.equal(
      (await listProducts(ids.tenantB)).find((p) => p.id === ids.productB)?.name,
      "Secret SKU",
    );

    assert.equal(await deleteKbDocument(ids.tenantA, ids.kbB), false);
    assert.equal(
      (await listKbDocuments(ids.tenantB)).some((d) => d.id === ids.kbB),
      true,
    );

    assert.equal(
      await updateComplaint(ids.tenantA, ids.complaintB, { status: "closed" }),
      null,
    );
    assert.equal(
      (await listComplaints(ids.tenantB)).find((c) => c.id === ids.complaintB)
        ?.status,
      "open",
    );

    assert.equal(
      await setConversationHandoffById(ids.tenantA, ids.convoB, true),
      null,
    );
    assert.equal(
      (await getConversation(ids.tenantB, ids.convoB))?.handoffActive,
      false,
    );
  });

  it("scopes dashboard APIs to the session tenant and returns 404 for cross-tenant ids", async () => {
    const sessionA = {
      userId: "user_iso_a",
      tenantId: ids.tenantA,
      email: "admin-a@iso.test",
      name: "A admin",
      role: "admin" as const,
    };

    const ordersApi = await import("../src/app/api/dashboard/orders/route");
    const leadsApi = await import("../src/app/api/dashboard/leads/route");
    const productsApi = await import("../src/app/api/dashboard/products/route");
    const chatsApi = await import("../src/app/api/dashboard/chats/route");
    const knowledgeApi = await import(
      "../src/app/api/dashboard/knowledge/route"
    );
    const analyticsApi = await import(
      "../src/app/api/dashboard/analytics/route"
    );

    const ordersGet = await ordersApi.GET(
      await cookieRequest(sessionA, "http://localhost/api/dashboard/orders"),
    );
    const ordersBody = (await ordersGet.json()) as {
      orders: { id: string }[];
    };
    assert.equal(ordersGet.status, 200);
    assert.equal(ordersBody.orders.some((o) => o.id === ids.orderB), false);

    const ordersPatch = await ordersApi.PATCH(
      await cookieRequest(sessionA, "http://localhost/api/dashboard/orders", {
        method: "PATCH",
        body: JSON.stringify({
          id: ids.orderB,
          trackingStatus: "cancelled",
        }),
      }),
    );
    assert.equal(ordersPatch.status, 404);

    const leadsGet = await leadsApi.GET(
      await cookieRequest(sessionA, "http://localhost/api/dashboard/leads"),
    );
    const leadsBody = (await leadsGet.json()) as { leads: { id: string }[] };
    assert.equal(leadsBody.leads.some((l) => l.id === ids.leadB), false);

    const leadsPatch = await leadsApi.PATCH(
      await cookieRequest(sessionA, "http://localhost/api/dashboard/leads", {
        method: "PATCH",
        body: JSON.stringify({ id: ids.leadB, crmStage: "won" }),
      }),
    );
    assert.equal(leadsPatch.status, 404);

    const productsGet = await productsApi.GET(
      await cookieRequest(sessionA, "http://localhost/api/dashboard/products"),
    );
    const productsBody = (await productsGet.json()) as {
      products: { id: string }[];
    };
    assert.equal(
      productsBody.products.some((p) => p.id === ids.productB),
      false,
    );

    const productsPatch = await productsApi.PATCH(
      await cookieRequest(sessionA, "http://localhost/api/dashboard/products", {
        method: "PATCH",
        body: JSON.stringify({ id: ids.productB, name: "Hijacked" }),
      }),
    );
    assert.equal(productsPatch.status, 404);

    const productsDelete = await productsApi.DELETE(
      await cookieRequest(
        sessionA,
        `http://localhost/api/dashboard/products?id=${ids.productB}`,
        { method: "DELETE" },
      ),
    );
    assert.equal(productsDelete.status, 404);

    const chatsGet = await chatsApi.GET(
      await cookieRequest(
        sessionA,
        `http://localhost/api/dashboard/chats?conversationId=${ids.convoB}`,
      ),
    );
    const chatsBody = (await chatsGet.json()) as {
      messages?: unknown[];
      conversation?: unknown;
    };
    assert.equal(chatsGet.status, 200);
    assert.equal(chatsBody.conversation, null);
    assert.equal((chatsBody.messages || []).length, 0);

    const chatsPatch = await chatsApi.PATCH(
      await cookieRequest(sessionA, "http://localhost/api/dashboard/chats", {
        method: "PATCH",
        body: JSON.stringify({
          conversationId: ids.convoB,
          action: "take",
        }),
      }),
    );
    assert.equal(chatsPatch.status, 404);

    const kbGet = await knowledgeApi.GET(
      await cookieRequest(sessionA, "http://localhost/api/dashboard/knowledge"),
    );
    const kbBody = (await kbGet.json()) as { kb: { id: string }[] };
    assert.equal(kbBody.kb.some((d) => d.id === ids.kbB), false);

    const kbDelete = await knowledgeApi.PUT(
      await cookieRequest(sessionA, "http://localhost/api/dashboard/knowledge", {
        method: "PUT",
        body: JSON.stringify({ action: "delete_kb", id: ids.kbB }),
      }),
    );
    const kbDeleteBody = (await kbDelete.json()) as { ok?: boolean };
    assert.equal(kbDelete.status, 200);
    assert.equal(kbDeleteBody.ok, false);

    const analyticsGet = await analyticsApi.GET(
      await cookieRequest(sessionA, "http://localhost/api/dashboard/analytics"),
    );
    const analyticsBody = (await analyticsGet.json()) as {
      analytics: { orders: number; products: number };
    };
    assert.equal(analyticsBody.analytics.orders, 0);
    assert.equal(analyticsBody.analytics.products, 0);
  });

  it("treats SUPER_ADMIN as an email gate, not a cross-tenant data bypass", async () => {
    const tenantsApi = await import("../src/app/api/admin/tenants/route");
    const ordersApi = await import("../src/app/api/dashboard/orders/route");

    const tenantAdmin = {
      userId: "user_iso_a",
      tenantId: ids.tenantA,
      email: "admin-a@iso.test",
      name: "A admin",
      role: "admin" as const,
    };
    const superAdminOnA = {
      userId: "user_ops",
      tenantId: ids.tenantA,
      email: "ops-superadmin@replypilot.test",
      name: "Ops",
      role: "admin" as const,
    };

    const forbiddenList = await tenantsApi.GET(
      await cookieRequest(tenantAdmin, "http://localhost/api/admin/tenants"),
    );
    assert.equal(forbiddenList.status, 403);

    const allowedList = await tenantsApi.GET(
      await cookieRequest(superAdminOnA, "http://localhost/api/admin/tenants"),
    );
    assert.equal(allowedList.status, 200);
    const listBody = (await allowedList.json()) as {
      tenants: { id: string; disabled: boolean }[];
    };
    assert.equal(listBody.tenants.some((t) => t.id === ids.tenantA), true);
    assert.equal(listBody.tenants.some((t) => t.id === ids.tenantB), true);

    const forbiddenDisable = await tenantsApi.PATCH(
      await cookieRequest(tenantAdmin, "http://localhost/api/admin/tenants", {
        method: "PATCH",
        body: JSON.stringify({ tenantId: ids.tenantB, disabled: true }),
      }),
    );
    assert.equal(forbiddenDisable.status, 403);

    const disableB = await tenantsApi.PATCH(
      await cookieRequest(superAdminOnA, "http://localhost/api/admin/tenants", {
        method: "PATCH",
        body: JSON.stringify({ tenantId: ids.tenantB, disabled: true }),
      }),
    );
    assert.equal(disableB.status, 200);

    const afterDisable = await tenantsApi.GET(
      await cookieRequest(superAdminOnA, "http://localhost/api/admin/tenants"),
    );
    const afterBody = (await afterDisable.json()) as {
      tenants: { id: string; disabled: boolean }[];
    };
    assert.equal(
      afterBody.tenants.find((t) => t.id === ids.tenantB)?.disabled,
      true,
    );

    const enableB = await tenantsApi.PATCH(
      await cookieRequest(superAdminOnA, "http://localhost/api/admin/tenants", {
        method: "PATCH",
        body: JSON.stringify({ tenantId: ids.tenantB, disabled: false }),
      }),
    );
    assert.equal(enableB.status, 200);

    // Super-admin email does not let dashboard routes read the other tenant.
    const superOrders = await ordersApi.GET(
      await cookieRequest(
        superAdminOnA,
        "http://localhost/api/dashboard/orders",
      ),
    );
    const superOrdersBody = (await superOrders.json()) as {
      orders: { id: string }[];
    };
    assert.equal(
      superOrdersBody.orders.some((o) => o.id === ids.orderB),
      false,
    );
  });
});

after(async () => {
  if (!hasDb) return;
  const { prisma } = await import("../src/lib/db/prisma");
  await prisma.$disconnect();
});
