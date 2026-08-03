import { NextResponse } from "next/server";
import {
  getAnalyticsSummary,
  getBotConfig,
  getSessionFromRequest,
  listConversations,
  listFaq,
  listKbDocuments,
  listLeads,
  listOrders,
  listPages,
  listProducts,
  listUsers,
  metaConnectConfigured,
} from "@/lib/db";
import { messengerConfigured } from "@/lib/bot/pipeline";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const tenantId = session.tenantId;
  const [
    analytics,
    leads,
    orders,
    products,
    conversations,
    faq,
    kb,
    pages,
    users,
    config,
  ] = await Promise.all([
    getAnalyticsSummary(tenantId),
    listLeads(tenantId),
    listOrders(tenantId),
    listProducts(tenantId),
    listConversations(tenantId),
    listFaq(tenantId),
    listKbDocuments(tenantId),
    listPages(tenantId),
    listUsers(tenantId),
    getBotConfig(tenantId),
  ]);

  return NextResponse.json({
    ok: true,
    session,
    analytics,
    leads,
    orders,
    products,
    conversations,
    faq,
    kb,
    pages,
    users,
    config,
    messenger: messengerConfigured(),
    connect: metaConnectConfigured(),
  });
}
