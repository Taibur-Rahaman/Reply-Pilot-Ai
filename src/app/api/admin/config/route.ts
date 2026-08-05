import { NextResponse } from "next/server";
import {
  getAdminPassword,
  loadBusinessConfig,
  saveBusinessConfig,
  type BusinessConfig,
} from "@/lib/bot/config";
import { messengerConfigured } from "@/lib/bot/pipeline";
import { setHandoff } from "@/lib/bot/handoff";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
}

function checkAuth(request: Request): boolean {
  const expected = getAdminPassword();
  if (!expected) {
    // If no password configured, allow only in non-production for local MVP.
    return process.env.NODE_ENV !== "production";
  }
  // Header only — query params can leak into access logs / proxy caches.
  const header = request.headers.get("x-admin-password") || "";
  return header === expected;
}

export async function GET(request: Request) {
  if (!checkAuth(request)) return unauthorized();

  const config = await loadBusinessConfig();
  return NextResponse.json({
    ok: true,
    config,
    messenger: messengerConfigured(),
    note: "Page access token and Meta secrets stay in env — not returned here.",
  });
}

export async function PUT(request: Request) {
  if (!checkAuth(request)) return unauthorized();

  try {
    const body = (await request.json()) as Partial<BusinessConfig> & {
      clearHandoffSenderId?: string;
    };

    if (body.clearHandoffSenderId) {
      await setHandoff(body.clearHandoffSenderId, false);
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

    const config = await saveBusinessConfig(patch);
    return NextResponse.json({ ok: true, config });
  } catch (error) {
    console.error("[api/admin/config]", error);
    return NextResponse.json({ error: "Could not save config." }, { status: 500 });
  }
}
