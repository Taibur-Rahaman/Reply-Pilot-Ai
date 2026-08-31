import { NextResponse } from "next/server";
import {
  getAnalyticsSummary,
  getBotConfig,
  getSessionFromRequest,
  metaConnectConfigured,
} from "@/lib/db";
import { messengerConfigured } from "@/lib/bot/pipeline";

export const runtime = "nodejs";

/**
 * Home KPIs only — do not load full CRM tables into memory here.
 * Lists belong on their own dashboard endpoints.
 */
export async function GET(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const tenantId = session.tenantId;
  const [analytics, config] = await Promise.all([
    getAnalyticsSummary(tenantId),
    getBotConfig(tenantId),
  ]);

  return NextResponse.json({
    ok: true,
    session: {
      userId: session.userId,
      tenantId: session.tenantId,
      email: session.email,
      name: session.name,
      role: session.role,
    },
    analytics,
    config: {
      businessName: config.businessName,
      botEnabled: config.botEnabled,
    },
    messenger: messengerConfigured(),
    connect: metaConnectConfigured(),
  });
}
