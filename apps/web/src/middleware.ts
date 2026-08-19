import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import { authConfig } from "@/lib/auth/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth?.user;
  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/register");
  const isOnboarding = pathname.startsWith("/onboarding");
  const isPublicPage = pathname.startsWith("/book/");
  const isPublicApi =
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/v1") ||
    pathname.startsWith("/api/demo") ||
    pathname === "/api/health" ||
    pathname.startsWith("/api/whatsapp/webhook") ||
    pathname === "/api/onboarding" ||
    pathname === "/api/leads/ingest";

  if (isPublicApi || isPublicPage || isOnboarding) {
    return NextResponse.next();
  }

  if (!isLoggedIn && !isAuthPage) {
    const login = new URL("/login", req.nextUrl.origin);
    login.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(login);
  }

  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
