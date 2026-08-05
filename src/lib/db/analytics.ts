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
  const [
    leadCount,
    orderCount,
    conversations,
    messages,
    products,
    todayConvos,
    todayOrderCount,
    crmStageGroups,
    trackingStatusGroups,
    wonLeads,
    openLeads,
    todayRevenueRow,
    outboundToday,
  ] = await Promise.all([
    prisma.lead.count({ where: { tenantId } }),
    prisma.order.count({ where: { tenantId } }),
    prisma.conversation.count({ where: { tenantId } }),
    prisma.message.count({ where: { tenantId } }),
    prisma.product.count({ where: { tenantId } }),
    prisma.conversation.count({
      where: { tenantId, lastMessageAt: { gte: today } },
    }),
    prisma.order.count({ where: { tenantId, createdAt: { gte: today } } }),
    prisma.lead.groupBy({ by: ["crmStage"], where: { tenantId }, _count: true }),
    prisma.order.groupBy({
      by: ["trackingStatus"],
      where: { tenantId },
      _count: true,
    }),
    prisma.lead.count({ where: { tenantId, crmStage: "won" } }),
    prisma.lead.count({
      where: {
        tenantId,
        crmStage: { in: ["new", "interested", "negotiating"] },
      },
    }),
    prisma.$queryRaw<{ revenue: number | null }[]>`
      SELECT SUM(CAST(qty AS float) * COALESCE("unitPrice", 0)) AS revenue
      FROM "Order"
      WHERE "tenantId" = ${tenantId} AND "createdAt" >= ${today}
    `,
    prisma.message.count({
      where: { tenantId, direction: "outbound", createdAt: { gte: today } },
    }),
  ]);

  const byCrmStage: Record<string, number> = {};
  for (const g of crmStageGroups) {
    byCrmStage[g.crmStage] = g._count;
  }
  const byTrackingStatus: Record<string, number> = {};
  for (const g of trackingStatusGroups) {
    byTrackingStatus[g.trackingStatus] = g._count;
  }

  const conversionRate =
    leadCount > 0 ? Math.round((orderCount / leadCount) * 100) : 0;
  const todayRevenue = Number(todayRevenueRow[0]?.revenue || 0);

  // Heuristic AI cost: outbound messages today × estimated tokens × rate.
  // Rough estimate only — wire up real usage.total_tokens from the LLM
  // response for an accurate figure.
  const costPer1k = Number(process.env.AI_COST_PER_1K || "0.002");
  const tokensPerReply = 900;
  const aiCostEstimate =
    Math.round(
      ((outboundToday * tokensPerReply) / 1000) * costPer1k * 10000,
    ) / 10000;

  return {
    leads: leadCount,
    orders: orderCount,
    conversations,
    messages,
    products,
    wonLeads,
    conversionRate,
    byCrmStage,
    byTrackingStatus,
    todayConversations: todayConvos,
    todayOrders: todayOrderCount,
    todayRevenue,
    openLeads,
    aiCostEstimate,
  };
}
