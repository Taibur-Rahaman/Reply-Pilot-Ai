import { NextResponse } from "next/server";
import { authenticateUser, encodeSession, writeAuditLog } from "@/lib/db";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rl = checkRateLimit(
    `login:${getClientIp(request)}`,
    10,
    15 * 60 * 1000,
  );
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterSec!);

  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
      tenantSlug?: string;
    };
    const email = String(body.email || "").trim();
    const password = String(body.password || "");

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password required." },
        { status: 400 },
      );
    }

    const session = await authenticateUser(
      email,
      password,
      body.tenantSlug?.trim(),
    );
    if (session === "needs_tenant") {
      return NextResponse.json(
        {
          error: "Multiple tenants share this email. Pass tenantSlug.",
          code: "needs_tenant",
        },
        { status: 409 },
      );
    }
    if (!session) {
      return NextResponse.json(
        { error: "Invalid credentials." },
        { status: 401 },
      );
    }

    await writeAuditLog({
      tenantId: session.tenantId,
      actorId: session.userId,
      actorEmail: session.email,
      action: "auth.login_success",
      entityType: "user",
      entityId: session.userId,
    }).catch(() => undefined);

    const token = await encodeSession(session);
    const response = NextResponse.json({ ok: true, session });
    response.cookies.set("facetai_session", token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 14,
      secure: process.env.NODE_ENV === "production",
    });
    return response;
  } catch (error) {
    console.error("[api/auth/login]", error);
    return NextResponse.json({ error: "Login failed." }, { status: 500 });
  }
}
