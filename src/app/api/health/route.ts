import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

/** Uptime/monitoring probe — checks the app can reach Postgres. */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, status: "healthy" });
  } catch (error) {
    console.error("[api/health] DB check failed:", error);
    return NextResponse.json(
      { ok: false, status: "unhealthy" },
      { status: 503 },
    );
  }
}
