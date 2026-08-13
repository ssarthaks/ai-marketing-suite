import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import { edgeAuthConfig } from "@/server/auth/edge-config";

const { auth } = NextAuth(edgeAuthConfig);

export default auth((request) => {
  const nonce = btoa(crypto.randomUUID());
  const isProduction = process.env.NODE_ENV === "production";
  const contentSecurityPolicy = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isProduction ? "" : " 'unsafe-eval'"}`,
    "script-src-attr 'none'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://res.cloudinary.com https://image.pollinations.ai https://gen.pollinations.ai https://media.pollinations.ai",
    "media-src 'self' blob: data: https://res.cloudinary.com https://image.pollinations.ai https://gen.pollinations.ai https://text.pollinations.ai https://media.pollinations.ai https://interactive-examples.mdn.mozilla.net https://vjs.zencdn.net https://media.w3.org",
    "font-src 'self' data:",
    `connect-src 'self' https://api.cloudinary.com https://gen.pollinations.ai https://image.pollinations.ai https://text.pollinations.ai https://media.pollinations.ai https://enter.pollinations.ai wss://gen.pollinations.ai${isProduction ? "" : " ws: wss:"}`,
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "frame-src 'none'",
    ...(isProduction ? ["upgrade-insecure-requests"] : []),
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicy);
  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set("Content-Security-Policy", contentSecurityPolicy);
  return response;
});

export const config = {
  matcher: [
    // Run on everything except static assets and image optimization.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
