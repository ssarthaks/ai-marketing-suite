import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "./auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const nonce = btoa(crypto.randomUUID());
  const isProduction = process.env.NODE_ENV === "production";
  const contentSecurityPolicy = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isProduction ? "" : " 'unsafe-eval'"}`,
    "script-src-attr 'none'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://res.cloudinary.com",
    "font-src 'self' data:",
    "connect-src 'self'",
    "media-src 'self' blob: https://res.cloudinary.com",
    "object-src 'none'",
    "frame-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isProduction ? ["upgrade-insecure-requests"] : []),
  ].join("; ");

  const continueWithSecurityHeaders = () => {
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-nonce", nonce);
    requestHeaders.set("Content-Security-Policy", contentSecurityPolicy);
    const response = NextResponse.next({
      request: { headers: requestHeaders },
    });
    response.headers.set("Content-Security-Policy", contentSecurityPolicy);
    return response;
  };

  const { nextUrl } = req;
  const isAuthenticated = Boolean(req.auth?.user?.email);
  const isPublicRoute = [
    "/login",
    "/forgot-password",
    "/reset-password",
  ].includes(nextUrl.pathname);

  if (!isAuthenticated && !isPublicRoute) {
    const newUrl = new URL("/login", nextUrl.origin);
    return NextResponse.redirect(newUrl);
  }

  if (isAuthenticated) {
    const user = req.auth?.user;

    // Redirect to setup-password if force_password_change is true
    if (user?.force_password_change && nextUrl.pathname !== "/setup-password") {
      return Response.redirect(new URL("/setup-password", nextUrl.origin));
    }

    // If they already changed password, don't let them access /setup-password
    if (
      !user?.force_password_change &&
      nextUrl.pathname === "/setup-password"
    ) {
      return Response.redirect(new URL("/", nextUrl.origin));
    }

    // Role-based protection for /admin
    if (nextUrl.pathname.startsWith("/admin")) {
      const isEditor = nextUrl.pathname.startsWith("/admin/editor");
      if (isEditor) {
        if (user?.role !== "admin" && user?.role !== "team_lead") {
          return Response.redirect(new URL("/", nextUrl.origin));
        }
      } else {
        // Admin pages that aren't editor (like /admin/users) are strictly admin only
        if (user?.role !== "admin") {
          return Response.redirect(new URL("/", nextUrl.origin));
        }
      }
    }
  }

  return continueWithSecurityHeaders();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icon.png).*)"],
};
