import type { SearchResult } from "./types";

const TRACKING_PARAMETERS = new Set([
  "fbclid",
  "gclid",
  "msclkid",
  "mc_cid",
  "mc_eid",
  "ref_src",
]);

export function normalizePlainText(value: string): string {
  let withoutControls = "";
  for (const character of value) {
    const code = character.charCodeAt(0);
    if (
      code === 0x7f ||
      (code >= 0x00 && code <= 0x08) ||
      code === 0x0b ||
      code === 0x0c ||
      (code >= 0x0e && code <= 0x1f)
    ) {
      continue;
    }
    withoutControls += character;
  }
  return withoutControls.replace(/\s+/g, " ").trim();
}

export function compactPlainText(value: string, maxCharacters: number): string {
  return truncateText(normalizePlainText(value), maxCharacters).text;
}

export function compactMarkdown(value: string): string {
  const lines = value
    .replaceAll("\r\n", "\n")
    .replaceAll("\r", "\n")
    .split("\n");
  const output: string[] = [];
  let previousBlank = false;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const blank = line.trim().length === 0;
    if (blank && previousBlank) continue;
    output.push(blank ? "" : line);
    previousBlank = blank;
  }
  return output.join("\n").trim();
}

export function truncateText(
  value: string,
  maximum: number,
  marker = "\n\n[truncated]",
): { text: string; truncated: boolean } {
  if (value.length <= maximum) return { text: value, truncated: false };
  if (maximum <= marker.length) {
    return { text: value.slice(0, maximum), truncated: true };
  }

  const available = maximum - marker.length;
  const candidate = value.slice(0, available);
  const paragraphBoundary = candidate.lastIndexOf("\n\n");
  const wordBoundary = candidate.lastIndexOf(" ");
  const boundary =
    paragraphBoundary >= Math.floor(available * 0.65)
      ? paragraphBoundary
      : wordBoundary >= Math.floor(available * 0.8)
        ? wordBoundary
        : available;
  return {
    text: candidate.slice(0, boundary).trimEnd() + marker,
    truncated: true,
  };
}

export function normalizePublicResultUrl(value: string): string | null {
  if (value.length === 0 || value.length > 2_048) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password
  ) {
    return null;
  }
  url.hash = "";
  for (const name of [...url.searchParams.keys()]) {
    if (
      name.toLowerCase().startsWith("utm_") ||
      TRACKING_PARAMETERS.has(name.toLowerCase())
    ) {
      url.searchParams.delete(name);
    }
  }
  const normalized = url.toString();
  return normalized.length <= 2_048 ? normalized : null;
}

export function deduplicateSearchResults(
  results: readonly SearchResult[],
  limit: number,
): SearchResult[] {
  const seen = new Set<string>();
  const unique: SearchResult[] = [];

  for (const result of results) {
    const url = normalizePublicResultUrl(result.url);
    if (!url) continue;
    const key = url.toLowerCase();
    if (seen.has(key)) continue;
    const title = compactPlainText(result.title, 200);
    const snippet = compactPlainText(result.snippet, 500);
    if (!title || !snippet) continue;
    seen.add(key);
    unique.push({ title, url, snippet });
    if (unique.length >= limit) break;
  }
  return unique;
}

export function isSensitiveUrl(url: URL): boolean {
  const sensitiveNames = new Set([
    "access_token",
    "api_key",
    "apikey",
    "auth",
    "authorization",
    "code",
    "credential",
    "credentials",
    "jwt",
    "key",
    "password",
    "sig",
    "secret",
    "session",
    "signature",
    "token",
    "x_amz_credential",
    "x_amz_security_token",
    "x_amz_signature",
    "x_goog_credential",
    "x_goog_signature",
  ]);
  const sensitiveName = (name: string) => {
    const normalized = name.toLowerCase().replaceAll("-", "_");
    return (
      sensitiveNames.has(normalized) ||
      normalized.endsWith("_token") ||
      normalized.endsWith("_secret") ||
      normalized.endsWith("_signature") ||
      normalized.endsWith("_credential") ||
      normalized.endsWith("_password") ||
      normalized.endsWith("_api_key")
    );
  };
  if ([...url.searchParams.keys()].some(sensitiveName)) return true;

  for (const segment of url.pathname.split("/").filter(Boolean)) {
    const decoded = (() => {
      try {
        return decodeURIComponent(segment);
      } catch {
        return segment;
      }
    })();
    if (
      sensitiveName(decoded) ||
      (decoded.length >= 32 &&
        /[a-z]/i.test(decoded) &&
        /\d/.test(decoded) &&
        /^[a-z0-9._~-]+$/i.test(decoded))
    ) {
      return true;
    }
  }

  const nestedSecret =
    /(?:^|[?&#;])(?:access[_-]?token|api[_-]?key|auth(?:orization)?|credential|jwt|password|secret|session|sig(?:nature)?|token)=/i;
  for (const value of url.searchParams.values()) {
    if (value.length > 1_000) return true;
    let decoded = value;
    for (let pass = 0; pass < 2; pass += 1) {
      if (nestedSecret.test(decoded)) return true;
      try {
        const next = decodeURIComponent(decoded);
        if (next === decoded) break;
        decoded = next;
      } catch {
        break;
      }
    }
  }
  return false;
}
