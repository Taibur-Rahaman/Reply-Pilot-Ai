import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { LOGIN_PATH } from "@/lib/config";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/dashboard/login" || pathname === "/dashboard/login/") {
    return NextResponse.redirect(new URL(LOGIN_PATH, request.url));
  }

  if (pathname === "/Dashboard" || pathname === "/Dashboard/") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (pathname.startsWith("/Dashboard/")) {
    const rest = pathname.slice("/Dashboard".length);
    return NextResponse.redirect(new URL(`/dashboard${rest}`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/login", "/Dashboard", "/Dashboard/:path*"],
};
