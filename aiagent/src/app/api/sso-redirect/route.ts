import crypto from "node:crypto";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { requireActiveUser } from "@/lib/authz";
import { rateLimit } from "@/lib/rate-limit";
import { getApplicationOrigin } from "@/lib/server-security";

const SSO_ISSUER = "aiagent";
const SSO_AUDIENCE = "marketingtool";
const SSO_TOKEN_TTL_SECONDS = 60;

function getMarketingOrigin(): string {
  const configured =
    process.env.MARKETING_APP_URL || process.env.NEXT_PUBLIC_MARKETING_URL;
  if (!configured) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Marketing SSO destination is not configured");
    }
    return "http://localhost:3000";
  }

  const url = new URL(configured);
  const allowedHosts = new Set(
    (process.env.MARKETING_SSO_ALLOWED_HOSTS || "")
      .split(",")
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean),
  );
  const isLocalDevelopment =
    process.env.NODE_ENV !== "production" &&
    ["localhost", "127.0.0.1"].includes(url.hostname);

  if (
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    (url.protocol !== "https:" && !isLocalDevelopment) ||
    (process.env.NODE_ENV === "production" &&
      allowedHosts.size > 0 &&
      !allowedHosts.has(url.hostname.toLowerCase()))
  ) {
    throw new Error("Invalid Marketing SSO destination");
  }
  return url.origin;
}

function noStoreRedirect(pathname: string) {
  const response = NextResponse.redirect(
    new URL(pathname, getApplicationOrigin()),
    303,
  );
  response.headers.set("Cache-Control", "no-store, max-age=0");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

export async function GET() {
  try {
    const user = await requireActiveUser();
    const limit = await rateLimit(`sso:${user.id}`, 10, 60_000);
    if (!limit.success) {
      return new NextResponse("Too many requests", { status: 429 });
    }

    const secret = process.env.SSO_SECRET;
    if (!secret || secret.length < 32 || secret === process.env.AUTH_SECRET) {
      throw new Error("SSO signing secret is not securely configured");
    }

    const marketingOrigin = getMarketingOrigin();
    const token = jwt.sign(
      {
        email: user.email,
        id: user.id,
        purpose: "cross-app-login",
      },
      secret,
      {
        algorithm: "HS256",
        issuer: SSO_ISSUER,
        audience: SSO_AUDIENCE,
        expiresIn: SSO_TOKEN_TTL_SECONDS,
        jwtid: crypto.randomUUID(),
      },
    );

    const action = new URL("/api/sso", marketingOrigin).toString();
    const nonce = crypto.randomBytes(16).toString("base64");
    const html = `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><meta name="referrer" content="no-referrer"><title>Signing in…</title></head>
  <body>
    <form id="sso" method="post" action="${action}">
      <input type="hidden" name="token" value="${token}">
      <noscript><button type="submit">Continue to Marketing Tool</button></noscript>
    </form>
    <script nonce="${nonce}">document.getElementById("sso").submit()</script>
  </body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store, max-age=0",
        Pragma: "no-cache",
        "Referrer-Policy": "no-referrer",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": `default-src 'none'; script-src 'nonce-${nonce}'; script-src-attr 'none'; form-action ${marketingOrigin}; base-uri 'none'; frame-ancestors 'none'`,
      },
    });
  } catch (error) {
    if (
      error instanceof Error &&
      ["Unauthorized", "Password setup required"].includes(error.message)
    ) {
      return noStoreRedirect(
        `/login?returnTo=${encodeURIComponent("/api/sso-redirect")}`,
      );
    }

    console.error(
      "SSO handoff failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return new NextResponse("Unable to start secure sign-in", {
      status: 503,
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }
}
