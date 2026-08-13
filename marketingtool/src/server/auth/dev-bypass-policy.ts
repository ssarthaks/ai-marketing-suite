export interface DevelopmentAuthEnvironment {
  NODE_ENV?: string;
  DEV_AUTH_BYPASS?: string;
  DEV_AUTH_EMAIL?: string;
}

const LOOPBACK_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

/**
 * The development bypass is opt-in and fails closed outside `next dev`.
 * `DEV_AUTH_EMAIL` remains server-only and must identify an existing active
 * user in the shared AiAgent identity database.
 */
export function getDevelopmentAuthBypassEmail(
  environment: DevelopmentAuthEnvironment = process.env,
): string | null {
  if (
    environment.NODE_ENV !== "development" ||
    environment.DEV_AUTH_BYPASS !== "true"
  ) {
    return null;
  }

  const email = environment.DEV_AUTH_EMAIL?.trim().toLowerCase();
  if (
    !email ||
    email.length > 254 ||
    /\s/.test(email) ||
    email.indexOf("@") <= 0 ||
    email.endsWith("@")
  ) {
    return null;
  }
  return email;
}

export function isLoopbackAuthRequest(requestUrl: string | URL): boolean {
  try {
    const url = requestUrl instanceof URL ? requestUrl : new URL(requestUrl);
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      !url.username &&
      !url.password &&
      LOOPBACK_HOSTNAMES.has(url.hostname.toLowerCase())
    );
  } catch {
    return false;
  }
}

export function canUseDevelopmentAuthBypass(
  requestUrl: string | URL,
  environment: DevelopmentAuthEnvironment = process.env,
): boolean {
  return (
    getDevelopmentAuthBypassEmail(environment) !== null &&
    isLoopbackAuthRequest(requestUrl)
  );
}
