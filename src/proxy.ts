import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((request) => {
  const isLoggedIn = !!request.auth;
  const path = request.nextUrl.pathname;

  if (path.startsWith("/api/auth")) return NextResponse.next();
  if (path.startsWith("/api/cron/")) return NextResponse.next();

  if (path.startsWith("/api/") && !isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isLoggedIn && path !== "/login") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isLoggedIn && path === "/login") {
    return NextResponse.redirect(new URL("/inbox", request.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
};
