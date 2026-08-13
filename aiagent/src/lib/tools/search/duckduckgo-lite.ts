import { parseHTML } from "linkedom";
import { HTML_REQUEST_HEADERS, MAX_SEARCH_RESPONSE_BYTES } from "../constants";
import { WebToolError } from "../errors";
import { fetchPublicText, type PublicFetch } from "../public-fetch";
import { deduplicateSearchResults } from "../text";
import type { SearchProvider, SearchResult } from "../types";
import { decodeDuckDuckGoUrl, toSearchResult } from "./provider-utils";

function nextSnippet(anchor: Element): string {
  let row = anchor.closest("tr")?.nextElementSibling;
  for (let attempts = 0; row && attempts < 3; attempts += 1) {
    const snippet =
      row.querySelector(".result-snippet") ||
      row.querySelector(".result__snippet") ||
      row.querySelector("td.result-snippet") ||
      row.querySelector("td:nth-child(2)");
    const text = snippet?.textContent?.trim();
    if (text) return text;
    row = row.nextElementSibling;
  }
  const container = anchor.parentElement?.parentElement;
  return (
    container
      ?.querySelector(".result-snippet, .result__snippet")
      ?.textContent?.trim() || ""
  );
}

function parseDuckDuckGoLitePage(
  text: string,
  limit: number,
): { challenged: boolean; results: SearchResult[] } {
  const { document } = parseHTML(text);
  if (
    document.querySelector(
      ".anomaly-modal, form.challenge-form, .g-recaptcha, [data-sitekey]",
    )
  ) {
    return { challenged: true, results: [] };
  }
  const anchors = document.querySelectorAll(
    "a.result-link, a.result__a, a[data-testid='result-title-a']",
  );
  const results: SearchResult[] = [];
  for (const anchor of anchors) {
    const href = anchor.getAttribute("href");
    if (!href) continue;
    const resultUrl = decodeDuckDuckGoUrl(href);
    if (!resultUrl) continue;
    const mapped = toSearchResult(
      anchor.textContent || "",
      resultUrl,
      nextSnippet(anchor),
    );
    if (mapped) results.push(mapped);
    if (results.length >= limit) break;
  }
  return {
    challenged: false,
    results: deduplicateSearchResults(results, limit),
  };
}

export function parseDuckDuckGoLiteHtml(
  text: string,
  limit: number,
): SearchResult[] {
  return parseDuckDuckGoLitePage(text, limit).results;
}

export class DuckDuckGoLiteProvider implements SearchProvider {
  readonly name = "duckduckgo-lite";
  private readonly publicFetch?: PublicFetch;

  constructor(publicFetch?: PublicFetch) {
    this.publicFetch = publicFetch;
  }

  async search(query: string, limit: number): Promise<SearchResult[]> {
    const url = new URL("https://lite.duckduckgo.com/lite/");
    url.searchParams.set("q", query);
    const { response, text } = await fetchPublicText(
      url.toString(),
      {
        headers: HTML_REQUEST_HEADERS,
        timeoutMs: 4_000,
        maxResponseBytes: MAX_SEARCH_RESPONSE_BYTES,
        maxRedirects: 1,
      },
      this.publicFetch,
    );
    if (!response.ok) {
      throw new WebToolError(
        response.status === 429 ? "RATE_LIMITED" : "PROVIDER_UNAVAILABLE",
        "DuckDuckGo Lite is unavailable.",
        response.status === 429 || response.status >= 500,
      );
    }
    const parsed = parseDuckDuckGoLitePage(text, limit);
    if (parsed.challenged) {
      throw new WebToolError(
        "PROVIDER_UNAVAILABLE",
        "DuckDuckGo Lite returned an access challenge.",
        true,
      );
    }
    return parsed.results;
  }
}
