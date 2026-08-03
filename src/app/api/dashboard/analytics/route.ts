import { NextResponse } from "next/server";
import { getAnalyticsSummary, getSessionFromRequest } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const analytics = await getAnalyticsSummary(session.tenantId);
  return NextResponse.json({
    ok: true,
    analytics,
    wave: "B",
    note: "F47 AI Analytics — thin counts from tenant DB. Revenue/ad performance deepen in Wave B.",
  });
}
