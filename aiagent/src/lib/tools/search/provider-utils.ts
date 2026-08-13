import { htmlFragmentToText } from "../reader/html-to-markdown";
import { compactPlainText, normalizePublicResultUrl } from "../text";
import type { SearchResult } from "../types";

export function toSearchResult(
  title: unknown,
  url: unknown,
  snippet: unknown,
  htmlFields = false,
): SearchResult | null {
  if (
    typeof title !== "string" ||
    typeof url !== "string" ||
    typeof snippet !== "string"
  ) {
    return null;
  }
  const normalizedUrl = normalizePublicResultUrl(url);
  if (!normalizedUrl) return null;
  const normalizedTitle = htmlFields
    ? htmlFragmentToText(title)
    : compactPlainText(title, 200);
  const normalizedSnippet = htmlFields
    ? htmlFragmentToText(snippet)
    : compactPlainText(snippet, 500);
  if (!normalizedTitle || !normalizedSnippet) return null;
  return {
    title: compactPlainText(normalizedTitle, 200),
    url: normalizedUrl,
    snippet: compactPlainText(normalizedSnippet, 500),
  };
}

export function decodeDuckDuckGoUrl(rawHref: string): string | null {
  try {
    const url = new URL(rawHref, "https://lite.duckduckgo.com/");
    if (
      ["duckduckgo.com", "www.duckduckgo.com", "lite.duckduckgo.com"].includes(
        url.hostname.toLowerCase(),
      ) &&
      url.pathname.startsWith("/l/")
    ) {
      const destination = url.searchParams.get("uddg");
      return destination ? normalizePublicResultUrl(destination) : null;
    }
    return normalizePublicResultUrl(url.toString());
  } catch {
    return null;
  }
}
