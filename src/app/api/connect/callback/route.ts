import { NextResponse } from "next/server";
import {
  decodeSession,
  metaConnectConfigured,
  saveOAuthPageStub,
} from "@/lib/db";

export const runtime = "nodejs";

/**
 * OAuth callback scaffold for FaceTai Connect (F39).
 * Real token exchange requires META_APP_ID + META_APP_SECRET + META_REDIRECT_URI.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  const dashboardUrl = new URL("/dashboard/connect", url.origin);

  if (error) {
    dashboardUrl.searchParams.set("error", errorDescription || error);
    return NextResponse.redirect(dashboardUrl);
  }

  const session = await decodeSession(state || undefined);
  if (!session) {
    dashboardUrl.searchParams.set("error", "Invalid OAuth state / session.");
    return NextResponse.redirect(dashboardUrl);
  }

  const connect = metaConnectConfigured();
  if (!connect.appId || !connect.appSecret || !connect.redirectUri) {
    await saveOAuthPageStub({
      tenantId: session.tenantId,
      pageId: "oauth_incomplete",
      pageName: "OAuth attempt (credentials missing)",
      status: "error",
      mode: "oauth",
      lastError:
        "META_APP_ID / META_APP_SECRET / META_REDIRECT_URI not fully configured.",
    });
    dashboardUrl.searchParams.set(
      "error",
      "Meta app credentials missing — use Demo Connect for local UX.",
    );
    return NextResponse.redirect(dashboardUrl);
  }

  if (!code) {
    dashboardUrl.searchParams.set("error", "No authorization code from Facebook.");
    return NextResponse.redirect(dashboardUrl);
  }

  try {
    const redirectUri = process.env.META_REDIRECT_URI!.trim();
    const tokenUrl = new URL("https://graph.facebook.com/v21.0/oauth/access_token");
    tokenUrl.searchParams.set("client_id", process.env.META_APP_ID!.trim());
    tokenUrl.searchParams.set(
      "client_secret",
      process.env.META_APP_SECRET!.trim(),
    );
    tokenUrl.searchParams.set("redirect_uri", redirectUri);
    tokenUrl.searchParams.set("code", code);

    const tokenRes = await fetch(tokenUrl.toString());
    const tokenJson = (await tokenRes.json()) as {
      access_token?: string;
      error?: { message?: string };
    };

    if (!tokenRes.ok || !tokenJson.access_token) {
      await saveOAuthPageStub({
        tenantId: session.tenantId,
        pageId: "oauth_token_fail",
        pageName: "OAuth token exchange failed",
        status: "error",
        mode: "oauth",
        lastError: tokenJson.error?.message || "Token exchange failed",
      });
      dashboardUrl.searchParams.set(
        "error",
        tokenJson.error?.message || "Token exchange failed",
      );
      return NextResponse.redirect(dashboardUrl);
    }

    // Fetch pages the user manages
    const pagesRes = await fetch(
      `https://graph.facebook.com/v21.0/me/accounts?access_token=${encodeURIComponent(tokenJson.access_token)}`,
    );
    const pagesJson = (await pagesRes.json()) as {
      data?: { id: string; name: string; access_token?: string }[];
      error?: { message?: string };
    };

    const first = pagesJson.data?.[0];
    if (!first) {
      await saveOAuthPageStub({
        tenantId: session.tenantId,
        pageId: "no_pages",
        pageName: "No Pages returned",
        status: "error",
        mode: "oauth",
        lastError: pagesJson.error?.message || "No Facebook Pages on this account.",
      });
      dashboardUrl.searchParams.set(
        "error",
        "No Facebook Pages found for this account.",
      );
      return NextResponse.redirect(dashboardUrl);
    }

    // Store first page (UI can refine selection later). Webhook subscribe is next step.
    await saveOAuthPageStub({
      tenantId: session.tenantId,
      pageId: first.id,
      pageName: first.name,
      accessToken: first.access_token,
      status: "pending",
      mode: "oauth",
      lastError:
        "Token stored. Webhook auto-subscribe + permission check still need App Review / Graph subscribe call polish (Wave B).",
    });

    dashboardUrl.searchParams.set("connected", first.name);
    return NextResponse.redirect(dashboardUrl);
  } catch (err) {
    console.error("[api/connect/callback]", err);
    dashboardUrl.searchParams.set("error", "OAuth callback failed.");
    return NextResponse.redirect(dashboardUrl);
  }
}
