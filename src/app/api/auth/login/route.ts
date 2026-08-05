import { NextResponse } from "next/server";
import { authenticateUser, encodeSession } from "@/lib/db";
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
    };
    const email = String(body.email || "").trim();
    const password = String(body.password || "");

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password required." },
        { status: 400 },
      );
    }

    const session = await authenticateUser(email, password);
    if (!session) {
      return NextResponse.json(
        { error: "Invalid credentials." },
        { status: 401 },
      );
    }

    const token = await encodeSession(session);
    // The token is returned only as an httpOnly cookie. Echoing it in the JSON
    // body would make it readable by any script on the page, which defeats the
    // point of httpOnly — and the login form never used it.
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
