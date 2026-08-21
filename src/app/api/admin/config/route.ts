import { NextResponse } from "next/server";
import {
  getAdminPassword,
  loadBusinessConfig,
  saveBusinessConfig,
  type BusinessConfig,
} from "@/lib/bot/config";
import { messengerConfigured } from "@/lib/bot/pipeline";
import { setHandoff } from "@/lib/bot/handoff";
import { getSessionFromRequest } from "@/lib/db/auth";
import { DEFAULT_TENANT_ID } from "@/lib/db/types";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
}

async function resolveAdminTenant(request: Request): Promise<string | null> {
  const session = await getSessionFromRequest(request);
  if (session) return session.tenantId;
  if (process.env.NODE_ENV === "production") return null;
  const expected = getAdminPassword();
  const header = request.headers.get("x-admin-password") || "";
  if (expected && header === expected) return DEFAULT_TENANT_ID;
  if (!expected) return DEFAULT_TENANT_ID;
  return null;
}

export async function GET(request: Request) {
  const tenantId = await resolveAdminTenant(request);
  if (!tenantId) return unauthorized();

  const config = await loadBusinessConfig(tenantId);
  return NextResponse.json({
    ok: true,
    config,
    messenger: messengerConfigured(),
    note: "Page access token and Meta secrets stay in env — not returned here.",
  });
}

export async function PUT(request: Request) {
  const tenantId = await resolveAdminTenant(request);
  if (!tenantId) return unauthorized();

  try {
    const body = (await request.json()) as Partial<BusinessConfig> & {
      clearHandoffSenderId?: string;
    };

    if (body.clearHandoffSenderId) {
      await setHandoff(body.clearHandoffSenderId, false, tenantId);
    }

    const patch: Partial<BusinessConfig> = {};
    if (typeof body.pageId === "string") patch.pageId = body.pageId;
    if (typeof body.businessName === "string") {
      patch.businessName = body.businessName;
    }
    if (typeof body.greeting === "string") patch.greeting = body.greeting;
    if (typeof body.systemPrompt === "string") {
      patch.systemPrompt = body.systemPrompt;
    }
    if (typeof body.productFaq === "string") patch.productFaq = body.productFaq;
    if (typeof body.productImageUrl === "string") {
      patch.productImageUrl = body.productImageUrl;
    }
    if (typeof body.handoffEnabled === "boolean") {
      patch.handoffEnabled = body.handoffEnabled;
    }
    if (typeof body.botEnabled === "boolean") {
      patch.botEnabled = body.botEnabled;
    }

    const config = await saveBusinessConfig(patch, tenantId);
    return NextResponse.json({ ok: true, config });
  } catch (error) {
    console.error("[api/admin/config]", error);
    return NextResponse.json({ error: "Could not save config." }, { status: 500 });
  }
}
