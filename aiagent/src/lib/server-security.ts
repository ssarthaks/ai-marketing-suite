import crypto from "node:crypto";

const LOCAL_DEVELOPMENT_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

function isLocalDevelopmentOrigin(origin: string): boolean {
  if (process.env.NODE_ENV === "production") return false;
  try {
    const url = new URL(origin);
    return (
      url.protocol === "http:" &&
      !url.username &&
      !url.password &&
      LOCAL_DEVELOPMENT_HOSTS.has(url.hostname)
    );
  } catch {
    return false;
  }
}

export function getClientAddress(requestHeaders: Headers): string {
  const candidate =
    requestHeaders.get("cf-connecting-ip") ||
    requestHeaders.get("x-real-ip") ||
    requestHeaders.get("x-forwarded-for")?.split(",")[0] ||
    "unknown";

  return candidate.trim().slice(0, 64);
}

export async function getServerActionClientAddress(): Promise<string> {
  const { headers } = await import("next/headers");
  return getClientAddress(await headers());
}

export function hashResetToken(token: string): string {
  return crypto.createHash("sha256").update(token, "utf8").digest("hex");
}

export function getCredentialVersion(passwordHash: string): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("Authentication secret is not configured");
  }
  return crypto
    .createHmac("sha256", secret)
    .update(passwordHash, "utf8")
    .digest("base64url");
}

export function safeSecretEqual(provided: string, expected: string): boolean {
  const providedBuffer = Buffer.from(provided, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  return (
    providedBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(providedBuffer, expectedBuffer)
  );
}

export function getApplicationOrigin(): string {
  const configured = process.env.APP_URL || process.env.NEXTAUTH_URL;
  if (!configured) {
    return "http://localhost:3001";
  }

  const url = new URL(configured);
  const isLocalHost =
    url.protocol === "http:" && LOCAL_DEVELOPMENT_HOSTS.has(url.hostname);

  if (
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    (url.protocol !== "https:" && !isLocalHost)
  ) {
    throw new Error("Application URL must be a secure origin");
  }

  return url.origin;
}

export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  let applicationOrigin: string;
  try {
    applicationOrigin = getApplicationOrigin();
  } catch {
    return false;
  }

  let requestOrigin: string;
  try {
    requestOrigin = new URL(request.url).origin;
  } catch {
    return false;
  }

  const allowed = new Set<string>([applicationOrigin]);
  if (isLocalDevelopmentOrigin(requestOrigin)) {
    allowed.add(requestOrigin);
  }
  if (!origin) {
    return (
      allowed.has(requestOrigin) &&
      request.headers.get("sec-fetch-site") === "same-origin"
    );
  }
  try {
    return allowed.has(new URL(origin).origin);
  } catch {
    return false;
  }
}
