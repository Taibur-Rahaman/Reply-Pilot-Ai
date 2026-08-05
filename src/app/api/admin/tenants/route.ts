import { NextResponse } from "next/server";
import {
  getSessionFromRequest,
  listTenants,
  setTenantDisabled,
} from "@/lib/db";

export const runtime = "nodejs";

/**
 * Cross-tenant super-admin endpoint (platform operator only).
 * A tenant's own "admin" role only manages that tenant's team/settings —
 * it must NOT grant visibility into other tenants. This requires an
 * explicit SUPER_ADMIN_EMAIL match; there is no role-based fallback.
 */
function isSuperAdmin(
  session: Awaited<ReturnType<typeof getSessionFromRequest>>,
): boolean {
  if (!session) return false;
  const superEmail = process.env.SUPER_ADMIN_EMAIL?.trim();
  return Boolean(superEmail) && session.email === superEmail;
}

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!isSuperAdmin(session)) {
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
  if (!isSuperAdmin(session)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

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
