import { NextResponse } from "next/server";
import {
  getSessionFromRequest,
  listTenants,
  requireRole,
  setTenantDisabled,
} from "@/lib/db";

export const runtime = "nodejs";

/** Super-admin tenant list scaffold (Phase 1). */
export async function GET(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  // Phase 1: demo admin only (or env SUPER_ADMIN_EMAIL)
  const superEmail =
    process.env.SUPER_ADMIN_EMAIL?.trim() || "admin@demo.facetai.local";
  if (session.email !== superEmail && session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const tenants = await listTenants();
  return NextResponse.json({ ok: true, tenants });
}

export async function PATCH(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const forbidden = requireRole(session, ["admin"]);
  if (forbidden) return forbidden;

  try {
    const body = (await request.json()) as {
      tenantId?: string;
      disabled?: boolean;
    };
    if (!body.tenantId || typeof body.disabled !== "boolean") {
      return NextResponse.json(
        { error: "tenantId and disabled required." },
        { status: 400 },
      );
    }
    await setTenantDisabled(body.tenantId, body.disabled, session);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/admin/tenants]", error);
    return NextResponse.json({ error: "Update failed." }, { status: 500 });
  }
}
