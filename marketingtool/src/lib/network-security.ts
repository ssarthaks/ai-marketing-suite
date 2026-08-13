import "server-only";

import { lookup } from "dns/promises";
import { isIP, type LookupFunction } from "net";
import http from "http";
import https from "https";

const BLOCKED_HOST_SUFFIXES = [
  ".localhost",
  ".local",
  ".internal",
  ".home",
  ".lan",
];
const BLOCKED_HOSTS = new Set([
  "localhost",
  "metadata",
  "metadata.google.internal",
  "kubernetes.default",
  "kubernetes.default.svc",
]);
const REDIRECT_CODES = new Set([301, 302, 303, 307, 308]);

function ipv4Parts(address: string): number[] | null {
  const parts = address.split(".").map(Number);
  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return null;
  }
  return parts;
}

function isBlockedIpv4(address: string): boolean {
  const parts = ipv4Parts(address);
  if (!parts) return true;
  const [a, b, c] = parts;
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

function ipv6Parts(rawAddress: string): number[] | null {
  let address = rawAddress
    .toLowerCase()
    .replace(/^\[/, "")
    .replace(/\]$/, "")
    .split("%")[0];

  let ipv4Tail: number[] = [];
  const lastColon = address.lastIndexOf(":");
  const tail = address.slice(lastColon + 1);
  if (tail.includes(".")) {
    const parsed = ipv4Parts(tail);
    if (!parsed) return null;
    ipv4Tail = [
      (parsed[0] << 8) | parsed[1],
      (parsed[2] << 8) | parsed[3],
    ];
    address = `${address.slice(0, lastColon)}:v4`;
  }

  const halves = address.split("::");
  if (halves.length > 2) return null;
  const parseHalf = (value: string) =>
    value
      ? value.split(":").filter(Boolean).map((part) => {
          if (part === "v4") return -1;
          return /^[a-f0-9]{1,4}$/.test(part)
            ? Number.parseInt(part, 16)
            : Number.NaN;
        })
      : [];

  let left = parseHalf(halves[0]);
  let right = halves.length === 2 ? parseHalf(halves[1]) : [];
  const replaceV4 = (parts: number[]) =>
    parts.flatMap((part) => (part === -1 ? ipv4Tail : [part]));
  left = replaceV4(left);
  right = replaceV4(right);
  if ([...left, ...right].some((part) => !Number.isFinite(part))) return null;

  const missing = 8 - left.length - right.length;
  if ((halves.length === 1 && missing !== 0) || missing < 0) return null;
  return [...left, ...Array(missing).fill(0), ...right];
}

function isBlockedIpv6(address: string): boolean {
  const parts = ipv6Parts(address);
  if (!parts || parts.length !== 8) return true;
  const [first, second, , , , sixth, seventh, eighth] = parts;

  // IPv4-mapped IPv6.
  if (
    first === 0 &&
    second === 0 &&
    parts[2] === 0 &&
    parts[3] === 0 &&
    parts[4] === 0 &&
    sixth === 0xffff
  ) {
    return isBlockedIpv4(
      `${seventh >> 8}.${seventh & 255}.${eighth >> 8}.${eighth & 255}`,
    );
  }

  return (
    // Only globally routable unicast is useful to this tool.
    (first & 0xe000) !== 0x2000 ||
    (first & 0xfe00) === 0xfc00 ||
    (first & 0xffc0) === 0xfe80 ||
    (first & 0xff00) === 0xff00 ||
    // Documentation, Teredo, and 6to4 can conceal non-public endpoints.
    (first === 0x2001 && (second === 0 || second === 0x0db8)) ||
    first === 0x2002
  );
}

export function isPublicIpAddress(address: string): boolean {
  const family = isIP(address.replace(/^\[/, "").replace(/\]$/, ""));
  if (family === 4) return !isBlockedIpv4(address);
  if (family === 6) return !isBlockedIpv6(address);
  return false;
}

export function parsePublicHttpUrl(
  input: string,
  options: { allowImplicitHttps?: boolean } = {},
): URL {
  if (typeof input !== "string" || input.length < 1 || input.length > 2_048) {
    throw new Error("Invalid URL");
  }
  const candidate =
    options.allowImplicitHttps && !/^https?:\/\//i.test(input)
      ? `https://${input}`
      : input;
  const url = new URL(candidate);
  if (
    (url.protocol !== "https:" && url.protocol !== "http:") ||
    url.username ||
    url.password ||
    (url.port &&
      !(
        (url.protocol === "https:" && url.port === "443") ||
        (url.protocol === "http:" && url.port === "80")
      ))
  ) {
    throw new Error("Invalid URL");
  }

  const hostname = url.hostname
    .toLowerCase()
    .replace(/^\[/, "")
    .replace(/\]$/, "");
  if (
    !hostname ||
    hostname.length > 253 ||
    BLOCKED_HOSTS.has(hostname) ||
    BLOCKED_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix))
  ) {
    throw new Error("URL host is not allowed");
  }
  if (isIP(hostname) && !isPublicIpAddress(hostname)) {
    throw new Error("URL host is not allowed");
  }
  return url;
}

export async function assertPublicHostname(url: URL) {
  const hostname = url.hostname.replace(/^\[/, "").replace(/\]$/, "");
  if (isIP(hostname)) {
    if (!isPublicIpAddress(hostname)) throw new Error("URL host is not allowed");
    return [{ address: hostname, family: isIP(hostname) as 4 | 6 }];
  }

  const addresses = await Promise.race([
    lookup(hostname, { all: true, verbatim: true }),
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
    addresses.some((result) => !isPublicIpAddress(result.address))
  ) {
    throw new Error("URL host is not allowed");
  }
  return addresses;
}

export async function readResponseText(
  response: Response,
  maxBytes: number,
): Promise<string> {
  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new Error("Response is too large");
  }
  if (!response.body) return "";

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: false });
  let size = 0;
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new Error("Response is too large");
      }
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}

interface PublicPageResponse {
  url: string;
  contentType: string;
  body: string;
}

async function pinnedRequest(
  url: URL,
  address: string,
  family: 4 | 6,
  headers: Record<string, string>,
  timeoutMs: number,
  maxBytes: number,
) {
  const transport = url.protocol === "https:" ? https : http;
  return new Promise<{
    status: number;
    statusMessage: string;
    location?: string;
    contentType: string;
    body: string;
  }>((resolve, reject) => {
    const pinnedLookup: LookupFunction = (
      _hostname,
      _options,
      callback,
    ) => {
      callback(null, address, family);
    };
    const request = transport.request(
      url,
      {
        method: "GET",
        headers: { ...headers, "Accept-Encoding": "identity" },
        agent: false,
        lookup: pinnedLookup,
      },
      (response) => {
        const status = response.statusCode ?? 0;
        const declared = Number(response.headers["content-length"]);
        if (Number.isFinite(declared) && declared > maxBytes) {
          response.destroy();
          reject(new Error("Response is too large"));
          return;
        }

        let size = 0;
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > maxBytes) {
            response.destroy(new Error("Response is too large"));
            return;
          }
          chunks.push(chunk);
        });
        response.on("error", reject);
        response.on("end", () => {
          resolve({
            status,
            statusMessage: response.statusMessage ?? "",
            location:
              typeof response.headers.location === "string"
                ? response.headers.location
                : undefined,
            contentType:
              typeof response.headers["content-type"] === "string"
                ? response.headers["content-type"]
                : "",
            body: Buffer.concat(chunks).toString("utf8"),
          });
        });
      },
    );
    request.setTimeout(timeoutMs, () => {
      request.destroy(new Error("Request timed out"));
    });
    request.on("error", reject);
    request.end();
  });
}

/**
 * Fetch an external text page while pinning a pre-validated public DNS result.
 * Every redirect is resolved and validated independently.
 */
export async function fetchPublicPage(
  input: string,
  headers: Record<string, string>,
  options: {
    maxBytes?: number;
    timeoutMs?: number;
    maxRedirects?: number;
  } = {},
): Promise<PublicPageResponse> {
  const maxBytes = options.maxBytes ?? 2 * 1024 * 1024;
  const timeoutMs = options.timeoutMs ?? 8_000;
  const maxRedirects = options.maxRedirects ?? 4;
  let url = parsePublicHttpUrl(input, { allowImplicitHttps: true });

  for (let redirect = 0; redirect <= maxRedirects; redirect += 1) {
    const addresses = await assertPublicHostname(url);
    const selected = addresses[0];
    const response = await pinnedRequest(
      url,
      selected.address,
      selected.family as 4 | 6,
      headers,
      timeoutMs,
      maxBytes,
    );

    if (REDIRECT_CODES.has(response.status) && response.location) {
      if (redirect === maxRedirects) throw new Error("Too many redirects");
      url = parsePublicHttpUrl(new URL(response.location, url).toString());
      continue;
    }
    if (response.status < 200 || response.status >= 300) {
      throw new Error(`Remote server returned ${response.status}`);
    }

    const type = response.contentType.split(";")[0].trim().toLowerCase();
    if (
      !type.startsWith("text/") &&
      !["application/xhtml+xml", "application/xml"].includes(type)
    ) {
      throw new Error("Remote content type is not supported");
    }
    return {
      url: url.toString(),
      contentType: type,
      body: response.body,
    };
  }
  throw new Error("Too many redirects");
}
