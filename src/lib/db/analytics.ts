import { prisma } from "./prisma";

export type AnalyticsSummary = {
  leads: number;
  orders: number;
  conversations: number;
  messages: number;
  products: number;
  wonLeads: number;
  conversionRate: number;
  byCrmStage: Record<string, number>;
  byTrackingStatus: Record<string, number>;
  /** Phase 1 home KPIs */
  todayConversations: number;
  todayOrders: number;
  todayRevenue: number;
  openLeads: number;
  /** Rough token/cost stub when AI_COST_PER_1K set or estimate */
  aiCostEstimate: number;
};

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function getAnalyticsSummary(
  tenantId: string,
): Promise<AnalyticsSummary> {
  const today = startOfToday();
  const [leads, orders, conversations, messages, products, todayConvos, todayOrds] =
    await Promise.all([
      prisma.lead.findMany({ where: { tenantId } }),
      prisma.order.findMany({ where: { tenantId } }),
      prisma.conversation.count({ where: { tenantId } }),
      prisma.message.count({ where: { tenantId } }),
      prisma.product.count({ where: { tenantId } }),
      prisma.conversation.count({
        where: { tenantId, lastMessageAt: { gte: today } },
      }),
      prisma.order.findMany({
        where: { tenantId, createdAt: { gte: today } },
      }),
    ]);

  const byCrmStage: Record<string, number> = {};
  for (const l of leads) {
    byCrmStage[l.crmStage] = (byCrmStage[l.crmStage] || 0) + 1;
  }
  const byTrackingStatus: Record<string, number> = {};
  for (const o of orders) {
    byTrackingStatus[o.trackingStatus] =
      (byTrackingStatus[o.trackingStatus] || 0) + 1;
  }

  const wonLeads = leads.filter((l) => l.crmStage === "won").length;
  const conversionRate =
    leads.length > 0 ? Math.round((orders.length / leads.length) * 100) : 0;

  const todayRevenue = todayOrds.reduce((sum, o) => {
    const qty = Number(o.qty) || 1;
    return sum + qty * (o.unitPrice ?? 0);
  }, 0);

  const openLeads = leads.filter(
    (l) => l.crmStage === "new" || l.crmStage === "interested" || l.crmStage === "negotiating",
  ).length;

  // Heuristic AI cost: outbound messages today × estimated tokens × rate
  const outboundToday = await prisma.message.count({
    where: {
      tenantId,
      direction: "outbound",
      createdAt: { gte: today },
    },
  });
  const costPer1k = Number(process.env.AI_COST_PER_1K || "0.002");
  const tokensPerReply = 400;
  const aiCostEstimate =
    Math.round(
      ((outboundToday * tokensPerReply) / 1000) * costPer1k * 10000,
    ) / 10000;

  return {
    leads: leads.length,
    orders: orders.length,
    conversations,
    messages,
    products,
    wonLeads,
    conversionRate,
    byCrmStage,
    byTrackingStatus,
    todayConversations: todayConvos,
    todayOrders: todayOrds.length,
    todayRevenue,
    openLeads,
    aiCostEstimate,
  };
}
