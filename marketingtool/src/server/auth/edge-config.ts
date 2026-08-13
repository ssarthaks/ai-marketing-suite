import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe Auth.js config used by the middleware.
 * MUST NOT import Prisma, bcrypt, or any Node-only module.
 * The full config (with the Credentials provider) lives in ./index.ts.
 */

const PUBLIC_EXACT = new Set(["/", "/login"]);
const PUBLIC_PREFIXES = [
  "/p/",
  "/m/",
  "/api/auth/",
  "/api/public/",
  "/api/external/",
  // SSO receiver: must be reachable unauthenticated — it validates the
  // short-lived token itself and issues the session cookie.
  "/api/sso/",
];

export function isPublicPath(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) return true;
  return PUBLIC_PREFIXES.some(
    (prefix) =>
      pathname === prefix.slice(0, -1) || pathname.startsWith(prefix)
  );
}

export const edgeAuthConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60,
  },
  // In production, trust forwarded host headers only when the deployment is
  // behind a reviewed proxy that overwrites them.
  trustHost:
    process.env.NODE_ENV !== "production" ||
    process.env.AUTH_TRUST_HOST === "true",
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isLoggedIn = Boolean(auth?.user?.email);

      if (isPublicPath(pathname)) return true;
      return isLoggedIn;
    },
  },
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Host-marketingtool.session-token"
          : "marketingtool.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
} satisfies NextAuthConfig;
