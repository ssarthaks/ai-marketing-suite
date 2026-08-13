import { JSON_REQUEST_HEADERS, MAX_SEARCH_RESPONSE_BYTES } from "../constants";
import { WebToolError } from "../errors";
import { fetchPublicText, parseJson, type PublicFetch } from "../public-fetch";
import { deduplicateSearchResults } from "../text";
import type { SearchProvider, SearchResult } from "../types";
import { toSearchResult } from "./provider-utils";

type OpenSearchPayload = [unknown, unknown, unknown, unknown];

export class WikipediaOpenSearchProvider implements SearchProvider {
  readonly name = "wikipedia-opensearch";
  private readonly publicFetch?: PublicFetch;

  constructor(publicFetch?: PublicFetch) {
    this.publicFetch = publicFetch;
  }

  async search(query: string, limit: number): Promise<SearchResult[]> {
    const url = new URL("https://en.wikipedia.org/w/api.php");
    url.searchParams.set("action", "opensearch");
    url.searchParams.set("search", query);
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("namespace", "0");
    url.searchParams.set("format", "json");
    const { response, text } = await fetchPublicText(
      url.toString(),
      {
        headers: JSON_REQUEST_HEADERS,
        timeoutMs: 3_500,
        maxResponseBytes: MAX_SEARCH_RESPONSE_BYTES,
        maxRedirects: 1,
      },
      this.publicFetch,
    );
    if (!response.ok) {
      throw new WebToolError(
        response.status === 429 ? "RATE_LIMITED" : "PROVIDER_UNAVAILABLE",
        "Wikipedia OpenSearch is unavailable.",
        response.status === 429 || response.status >= 500,
      );
    }
    const payload = parseJson<OpenSearchPayload>(text, "Wikipedia OpenSearch");
    if (!Array.isArray(payload) || payload.length < 4) {
      throw new WebToolError(
        "PROVIDER_UNAVAILABLE",
        "Wikipedia OpenSearch returned an unexpected response.",
        true,
      );
    }
    const titles = Array.isArray(payload[1]) ? payload[1] : [];
    const snippets = Array.isArray(payload[2]) ? payload[2] : [];
    const urls = Array.isArray(payload[3]) ? payload[3] : [];
    const results: SearchResult[] = [];
    for (let index = 0; index < titles.length; index += 1) {
      const mapped = toSearchResult(
        titles[index],
        urls[index],
        snippets[index],
      );
      if (mapped) results.push(mapped);
    }
    return deduplicateSearchResults(results, limit);
  }
}
