import dns from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import net from "node:net";

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata.google.internal",
  "metadata",
  "instance-data",
  "kubernetes.default",
  "kubernetes.default.svc",
]);
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const finalResponseUrls = new WeakMap<Response, string>();

function isBlockedIpv4(address: string): boolean {
  const octets = address.split(".").map(Number);
  if (
    octets.length !== 4 ||
    octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)
  ) {
    return true;
  }
  const [a, b, c] = octets;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && c === 0) ||
    (a === 192 && b === 0 && c === 2) ||
    (a === 192 && b === 88 && c === 99) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    a >= 224
  );
}

function ipv6Bytes(address: string): number[] | null {
  let input = address.toLowerCase().split("%")[0];
  if (input.includes(".")) {
    const lastColon = input.lastIndexOf(":");
    const ipv4 = input.slice(lastColon + 1);
    if (net.isIP(ipv4) !== 4) return null;
    const bytes = ipv4.split(".").map(Number);
    input = `${input.slice(0, lastColon)}:${((bytes[0] << 8) | bytes[1]).toString(16)}:${((bytes[2] << 8) | bytes[3]).toString(16)}`;
  }

  const halves = input.split("::");
  if (halves.length > 2) return null;
  const left = halves[0] ? halves[0].split(":") : [];
  const right = halves[1] ? halves[1].split(":") : [];
  const missing = 8 - left.length - right.length;
  if (
    missing < 0 ||
    (halves.length === 1 && missing !== 0) ||
    [...left, ...right].some((part) => !/^[0-9a-f]{1,4}$/.test(part))
  ) {
    return null;
  }
  const groups = [
    ...left,
    ...Array(halves.length === 2 ? missing : 0).fill("0"),
    ...right,
  ].map((part) => Number.parseInt(part, 16));
  if (groups.length !== 8) return null;
  return groups.flatMap((group) => [group >> 8, group & 0xff]);
}

function isBlockedIpv6(address: string): boolean {
  const bytes = ipv6Bytes(address);
  if (!bytes) return true;
  const allZero = bytes.every((byte) => byte === 0);
  const loopback =
    bytes.slice(0, 15).every((byte) => byte === 0) && bytes[15] === 1;
  const ipv4Mapped =
    bytes.slice(0, 10).every((byte) => byte === 0) &&
    bytes[10] === 0xff &&
    bytes[11] === 0xff;
  if (ipv4Mapped) {
    return isBlockedIpv4(bytes.slice(12).join("."));
  }

  return (
    allZero ||
    loopback ||
    (bytes[0] & 0xfe) === 0xfc || // unique local fc00::/7
    (bytes[0] === 0xfe && (bytes[1] & 0xc0) === 0x80) || // link local
    bytes[0] === 0xff || // multicast
    (bytes[0] === 0x20 &&
      bytes[1] === 0x01 &&
      bytes[2] === 0x0d &&
      bytes[3] === 0xb8) ||
    (bytes[0] === 0x20 && bytes[1] === 0x02) || // 6to4
    (bytes[0] === 0x20 &&
      bytes[1] === 0x01 &&
      bytes[2] === 0 &&
      bytes[3] === 0) || // Teredo
    bytes.slice(0, 12).every((byte, index) => {
      if (index === 1) return byte === 0x64;
      if (index === 2) return byte === 0xff;
      if (index === 3) return byte === 0x9b;
      return byte === 0;
    }) // NAT64 well-known prefix
  );
}

function isBlockedAddress(address: string): boolean {
  const family = net.isIP(address);
  if (family === 4) return isBlockedIpv4(address);
  if (family === 6) return isBlockedIpv6(address);
  return true;
}

export async function validatePublicHttpUrl(input: string): Promise<URL> {
  if (typeof input !== "string" || input.length === 0 || input.length > 2_048) {
    throw new Error("Invalid URL");
  }

  const url = new URL(input);
  url.hash = "";
  const hostname = url.hostname
    .replace(/^\[|\]$/g, "")
    .replace(/\.$/, "")
    .toLowerCase();
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    (url.port && !["80", "443"].includes(url.port)) ||
    BLOCKED_HOSTNAMES.has(hostname) ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".lan") ||
    hostname.endsWith(".home") ||
    hostname.endsWith(".arpa")
  ) {
    throw new Error("URL is not allowed");
  }

  if (net.isIP(hostname)) {
    if (isBlockedAddress(hostname)) throw new Error("URL is not allowed");
    return url;
  }

  const addresses = await Promise.race([
    dns.lookup(hostname, { all: true, verbatim: true }),
    new Promise<never>((_resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("DNS lookup timed out")),
        3_000,
      );
      timeout.unref?.();
    }),
  ]);
  if (
    addresses.length === 0 ||
    addresses.length > 16 ||
    addresses.some(({ address }) => isBlockedAddress(address))
  ) {
    throw new Error("URL is not allowed");
  }
  return url;
}

type PinnedResponse = {
  status: number;
  statusText: string;
  headers: Headers;
  body: Buffer;
};

async function requestPinnedPublicUrl(
  url: URL,
  init: RequestInit,
  timeoutMs: number,
  maxResponseBytes: number,
): Promise<PinnedResponse> {
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  const resolved = net.isIP(hostname)
    ? [{ address: hostname, family: net.isIP(hostname) as 4 | 6 }]
    : await Promise.race([
        dns.lookup(hostname, { all: true, verbatim: true }),
        new Promise<never>((_resolve, reject) => {
          const timeout = setTimeout(
            () => reject(new Error("DNS lookup timed out")),
            3_000,
          );
          timeout.unref?.();
        }),
      ]);
  if (
    resolved.length === 0 ||
    resolved.length > 16 ||
    resolved.some(({ address }) => isBlockedAddress(address))
  ) {
    throw new Error("URL is not allowed");
  }

  const selected = resolved[0];
  const method = (init.method || "GET").toUpperCase();
  if (!["GET", "HEAD"].includes(method) || init.body) {
    throw new Error("Unsafe request method");
  }

  const requestHeaders = new Headers(init.headers);
  for (const sensitiveHeader of [
    "authorization",
    "cookie",
    "host",
    "proxy-authorization",
    "transfer-encoding",
  ]) {
    requestHeaders.delete(sensitiveHeader);
  }
  requestHeaders.set("Accept-Encoding", "identity");
  const headers = Object.fromEntries(requestHeaders.entries());
  const transport = url.protocol === "https:" ? https : http;

  return new Promise<PinnedResponse>((resolve, reject) => {
    const request = transport.request(
      url,
      {
        method,
        headers,
        agent: false,
        lookup: ((
          _hostname: string,
          _options: unknown,
          callback: (
            error: NodeJS.ErrnoException | null,
            address: string,
            family: number,
          ) => void,
        ) => callback(null, selected.address, selected.family)) as never,
      },
      (response) => {
        const status = response.statusCode || 502;
        const responseHeaders = new Headers();
        for (const [name, value] of Object.entries(response.headers)) {
          if (Array.isArray(value)) {
            for (const item of value) responseHeaders.append(name, item);
          } else if (typeof value === "string") {
            responseHeaders.set(name, value);
          }
        }

        if (REDIRECT_STATUSES.has(status)) {
          response.destroy();
          resolve({
            status,
            statusText: response.statusMessage || "",
            headers: responseHeaders,
            body: Buffer.alloc(0),
          });
          return;
        }

        const declaredLength = Number(
          response.headers["content-length"] || "0",
        );
        if (
          Number.isFinite(declaredLength) &&
          declaredLength > maxResponseBytes
        ) {
          response.destroy();
          reject(new Error("Response is too large"));
          return;
        }

        let totalBytes = 0;
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => {
          totalBytes += chunk.length;
          if (totalBytes > maxResponseBytes) {
            response.destroy(new Error("Response is too large"));
            return;
          }
          chunks.push(chunk);
        });
        response.on("error", reject);
        response.on("end", () => {
          resolve({
            status,
            statusText: response.statusMessage || "",
            headers: responseHeaders,
            body: Buffer.concat(chunks),
          });
        });
      },
    );

    const abort = () => request.destroy(new Error("Request aborted"));
    if (init.signal?.aborted) {
      abort();
    } else {
      init.signal?.addEventListener("abort", abort, { once: true });
    }
    request.setTimeout(timeoutMs, () => {
      request.destroy(new Error("Request timed out"));
    });
    request.on("error", reject);
    request.on("close", () => {
      init.signal?.removeEventListener("abort", abort);
    });
    request.end();
  });
}

export async function validatePublicRedirect(
  currentUrl: string | URL,
  location: string,
): Promise<URL> {
  return validatePublicHttpUrl(new URL(location, currentUrl).toString());
}

export async function safeFetchPublicUrl(
  input: string,
  init: RequestInit = {},
  options?: {
    maxRedirects?: number;
    timeoutMs?: number;
    maxResponseBytes?: number;
    allowedRedirectOrigins?: readonly string[];
  },
): Promise<Response> {
  let url = await validatePublicHttpUrl(input);
  const maxRedirects = options?.maxRedirects ?? 3;
  const allowedRedirectOrigins = options?.allowedRedirectOrigins
    ? new Set(options.allowedRedirectOrigins)
    : null;
  if (allowedRedirectOrigins && !allowedRedirectOrigins.has(url.origin)) {
    throw new Error("URL origin is not allowed");
  }

  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount++) {
    const pinned = await requestPinnedPublicUrl(
      url,
      init,
      options?.timeoutMs ?? 10_000,
      options?.maxResponseBytes ?? 1_000_000,
    );
    const response = new Response(
      pinned.body.length > 0 &&
        ![204, 205, 304].includes(pinned.status) &&
        (init.method || "GET").toUpperCase() !== "HEAD"
        ? Uint8Array.from(pinned.body)
        : null,
      {
        status: pinned.status,
        statusText: pinned.statusText,
        headers: pinned.headers,
      },
    );
    if (!REDIRECT_STATUSES.has(response.status)) {
      finalResponseUrls.set(response, url.toString());
      return response;
    }

    const location = response.headers.get("location");
    if (!location || redirectCount === maxRedirects) {
      await response.body?.cancel();
      throw new Error("Too many redirects");
    }
    await response.body?.cancel();
    const redirectUrl = await validatePublicRedirect(url, location);
    if (
      allowedRedirectOrigins &&
      !allowedRedirectOrigins.has(redirectUrl.origin)
    ) {
      throw new Error("Redirect target origin is not allowed");
    }
    url = redirectUrl;
  }
  throw new Error("Unable to fetch URL");
}

export function getSafeFetchFinalUrl(
  response: Response,
  fallback: string,
): string {
  return finalResponseUrls.get(response) || response.url || fallback;
}

export async function readTextResponseLimited(
  response: Response,
  maxBytes: number,
): Promise<string> {
  const declaredLength = Number(response.headers.get("content-length") || "0");
  if (declaredLength > maxBytes) {
    await response.body?.cancel();
    throw new Error("Response is too large");
  }
  if (!response.body) return "";

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let result = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new Error("Response is too large");
      }
      result += decoder.decode(value, { stream: true });
    }
    result += decoder.decode();
    return result;
  } finally {
    reader.releaseLock();
  }
}
