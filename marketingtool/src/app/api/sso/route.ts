import { NextResponse } from "next/server";

import { signIn } from "@/server/auth";
import { rateLimit } from "@/lib/rate-limit";
import {
  clientAddress,
  opaqueRateLimitKey,
} from "@/lib/request-security";

const MAX_TOKEN_LENGTH = 4_096;
const MAX_FORM_BYTES = MAX_TOKEN_LENGTH + 32;

async function readBoundedForm(request: Request): Promise<string> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_FORM_BYTES) {
    throw new Error("PAYLOAD_TOO_LARGE");
  }
  if (!request.body) return "";

  const reader = request.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let total = 0;
  let body = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_FORM_BYTES) {
        await reader.cancel();
        throw new Error("PAYLOAD_TOO_LARGE");
      }
      body += decoder.decode(value, { stream: true });
    }
    return body + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}

function appUrl(pathname: string, request: Request): URL {
  const requestUrl = new URL(request.url);
  if (
    !["http:", "https:"].includes(requestUrl.protocol) ||
    requestUrl.username ||
    requestUrl.password ||
    (process.env.NODE_ENV === "production" &&
      requestUrl.protocol !== "https:")
  ) {
    throw new Error("Invalid request origin");
  }

  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured) {
    const base = new URL(configured);
    if (
      !["http:", "https:"].includes(base.protocol) ||
      base.username ||
      base.password ||
      (process.env.NODE_ENV === "production" && base.protocol !== "https:")
    ) {
      throw new Error("Invalid application URL");
    }
    if (base.origin === requestUrl.origin) {
      return new URL(pathname, base);
    }
    console.warn(
      "Configured application origin does not match the request origin; using the request origin",
    );
  }
  return new URL(pathname, requestUrl.origin);
}

function redirectWithoutCaching(pathname: string, request: Request) {
  const response = NextResponse.redirect(appUrl(pathname, request), 303);
  response.headers.set("Cache-Control", "no-store, max-age=0");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

/**
 * SSO tokens arrive in a POST body so bearer credentials never appear in
 * browser history, referrers, reverse-proxy URLs, or analytics logs.
 */
export async function POST(request: Request) {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("application/x-www-form-urlencoded")) {
    return redirectWithoutCaching("/login?error=SSOFailed", request);
  }

  const address = await clientAddress();
  const limit = await rateLimit(
    opaqueRateLimitKey("sso", address),
    20,
    60_000,
  );
  if (!limit.success) {
    return redirectWithoutCaching("/login?error=SSOFailed", request);
  }

  try {
    const body = await readBoundedForm(request);

    const token = new URLSearchParams(body).get("token");
    if (!token || token.length > MAX_TOKEN_LENGTH) {
      return redirectWithoutCaching("/login?error=SSOFailed", request);
    }

    await signIn("credentials", {
      ssoToken: token,
      redirect: false,
    });

    return redirectWithoutCaching("/dashboard", request);
  } catch (error) {
    console.error(
      "SSO login failed:",
      error instanceof Error ? error.name : "Unknown error",
    );
    return redirectWithoutCaching("/login?error=SSOFailed", request);
  }
}
