import { JSON_REQUEST_HEADERS, MAX_SEARCH_RESPONSE_BYTES } from "../constants";
import { WebToolError } from "../errors";
import { fetchPublicText, parseJson, type PublicFetch } from "../public-fetch";
import { deduplicateSearchResults } from "../text";
import type { SearchProvider, SearchResult } from "../types";
import { toSearchResult } from "./provider-utils";

interface InstantTopic {
  Text?: unknown;
  FirstURL?: unknown;
  Topics?: unknown;
}

interface InstantPayload {
  AbstractText?: unknown;
  AbstractURL?: unknown;
  Heading?: unknown;
  RelatedTopics?: unknown;
}

function flattenTopics(value: unknown): InstantTopic[] {
  if (!Array.isArray(value)) return [];
  const flattened: InstantTopic[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const topic = item as InstantTopic;
    if (Array.isArray(topic.Topics)) {
      flattened.push(...flattenTopics(topic.Topics));
    } else {
      flattened.push(topic);
    }
  }
  return flattened;
}

export class DuckDuckGoInstantProvider implements SearchProvider {
  readonly name = "duckduckgo-instant";
  private readonly publicFetch?: PublicFetch;

  constructor(publicFetch?: PublicFetch) {
    this.publicFetch = publicFetch;
  }

  async search(query: string, limit: number): Promise<SearchResult[]> {
    const url = new URL("https://api.duckduckgo.com/");
    url.searchParams.set("q", query);
    url.searchParams.set("format", "json");
    url.searchParams.set("pretty", "0");
    url.searchParams.set("no_html", "1");
    url.searchParams.set("no_redirect", "1");
    url.searchParams.set("skip_disambig", "1");
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
        "DuckDuckGo Instant Answer is unavailable.",
        response.status === 429 || response.status >= 500,
      );
    }
    const payload = parseJson<InstantPayload>(
      text,
      "DuckDuckGo Instant Answer",
    );
    const results: SearchResult[] = [];
    const abstract = toSearchResult(
      payload.Heading || query,
      payload.AbstractURL,
      payload.AbstractText,
    );
    if (abstract) results.push(abstract);

    for (const topic of flattenTopics(payload.RelatedTopics)) {
      const mapped = toSearchResult(
        typeof topic.Text === "string"
          ? topic.Text.split(" - ", 1)[0]
          : topic.Text,
        topic.FirstURL,
        topic.Text,
      );
      if (mapped) results.push(mapped);
      if (results.length >= limit) break;
    }
    return deduplicateSearchResults(results, limit);
  }
}
