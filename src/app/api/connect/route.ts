import { NextResponse } from "next/server";
import {
  buildFacebookLoginUrl,
  connectDemoPage,
  encodeSession,
  getSessionFromRequest,
  listPages,
  metaConnectConfigured,
  newId,
  saveOAuthPageStub,
} from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const connect = metaConnectConfigured();
  const pages = await listPages(session.tenantId);
  const state = await encodeSession(session);
  const loginUrl = buildFacebookLoginUrl(state);

  return NextResponse.json({
    ok: true,
    connect,
    pages,
    loginUrl,
    mode: connect.appId && connect.redirectUri ? "oauth_ready" : "demo_only",
    docs: {
      steps: [
        "Create a Meta App (Business) and add Messenger + Facebook Login for Business / Embedded Signup.",
        "Set META_APP_ID, META_APP_SECRET, META_REDIRECT_URI (https://<domain>/api/connect/callback).",
        "Add redirect URI in Meta App settings.",
        "Click Login with Facebook → select Page → Connect.",
        "FaceTai will exchange code → long-lived Page token, subscribe webhook, activate bot (when App Review allows).",
      ],
      note: "Without META_APP_ID credentials, use Demo Connect for local UX only — not a live Meta Page.",
    },
  });
}

export async function POST(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      action?: "demo_connect" | "select_page";
      pageName?: string;
      pageId?: string;
    };

    if (body.action === "demo_connect") {
      const page = await connectDemoPage(
        session.tenantId,
        body.pageName || "Demo Facebook Page",
      );
      return NextResponse.json({
        ok: true,
        page,
        note: "Demo mode — no Meta Graph calls. Set META_APP_ID for real FaceTai Connect.",
      });
    }

    if (body.action === "select_page") {
      // Scaffold: would use user token to fetch pages; store selection pending subscribe
      const page = await saveOAuthPageStub({
        tenantId: session.tenantId,
        pageId: body.pageId || `pending_${newId("pg")}`,
        pageName: body.pageName || "Selected Page",
        status: "pending",
        mode: "oauth",
        lastError:
          "OAuth page select recorded. Complete token exchange + webhook subscribe when Meta credentials are live.",
      });
      return NextResponse.json({ ok: true, page });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (error) {
    console.error("[api/connect]", error);
    return NextResponse.json({ error: "Connect failed." }, { status: 500 });
  }
}
