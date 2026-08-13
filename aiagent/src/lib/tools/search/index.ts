import { MAX_SEARCH_RESULTS } from "../constants";
import { WebToolError } from "../errors";
import type { PublicFetch } from "../public-fetch";
import { deduplicateSearchResults } from "../text";
import type { SearchProvider, SearchResult } from "../types";
import { getToolInput, validateQuery } from "../validation";
import { DuckDuckGoInstantProvider } from "./duckduckgo-instant";
import { DuckDuckGoLiteProvider } from "./duckduckgo-lite";
import { SearxngProvider } from "./searxng";
import { WikipediaOpenSearchProvider } from "./wikipedia";

export interface SearchDependencies {
  publicFetch?: PublicFetch;
  providers?: SearchProvider[];
}

interface SearchOutcome {
  succeeded: boolean;
  results: SearchResult[];
}

async function safelySearch(
  provider: SearchProvider,
  query: string,
  limit: number,
): Promise<SearchOutcome> {
  try {
    return {
      succeeded: true,
      results: await provider.search(query, limit),
    };
  } catch {
    return { succeeded: false, results: [] };
  }
}

export async function searchTool(
  input: unknown,
  dependencies: SearchDependencies = {},
): Promise<SearchResult[]> {
  const query = validateQuery(getToolInput(input).query);
  const limit = MAX_SEARCH_RESULTS;

  if (dependencies.providers) {
    const results: SearchResult[] = [];
    let providerSucceeded = false;
    for (const provider of dependencies.providers) {
      const outcome = await safelySearch(provider, query, limit);
      providerSucceeded ||= outcome.succeeded;
      results.push(...outcome.results);
      const unique = deduplicateSearchResults(results, limit);
      if (unique.length >= limit) return unique;
    }
    if (!providerSucceeded) {
      throw new WebToolError(
        "PROVIDER_UNAVAILABLE",
        "Every configured search provider failed.",
        true,
      );
    }
    return deduplicateSearchResults(results, limit);
  }

  const searxng = new SearxngProvider({
    publicFetch: dependencies.publicFetch,
  });
  const instant = new DuckDuckGoInstantProvider(dependencies.publicFetch);
  const instantPromise = safelySearch(instant, query, Math.min(2, limit));
  const searxOutcome = await safelySearch(searxng, query, limit);
  if (deduplicateSearchResults(searxOutcome.results, limit).length >= limit) {
    return deduplicateSearchResults(searxOutcome.results, limit);
  }
  const instantOutcome = await instantPromise;

  let combined = deduplicateSearchResults(
    [...searxOutcome.results, ...instantOutcome.results],
    limit,
  );
  let providerSucceeded = searxOutcome.succeeded || instantOutcome.succeeded;
  if (combined.length < limit) {
    const lite = new DuckDuckGoLiteProvider(dependencies.publicFetch);
    const liteOutcome = await safelySearch(lite, query, limit);
    providerSucceeded ||= liteOutcome.succeeded;
    combined = deduplicateSearchResults(
      [...combined, ...liteOutcome.results],
      limit,
    );
  }
  if (combined.length === 0) {
    const wikipedia = new WikipediaOpenSearchProvider(dependencies.publicFetch);
    const wikipediaOutcome = await safelySearch(wikipedia, query, limit);
    providerSucceeded ||= wikipediaOutcome.succeeded;
    combined = deduplicateSearchResults(wikipediaOutcome.results, limit);
  }
  if (!providerSucceeded) {
    throw new WebToolError(
      "PROVIDER_UNAVAILABLE",
      "Every free search provider failed.",
      true,
    );
  }
  return combined;
}

export {
  DuckDuckGoInstantProvider,
  DuckDuckGoLiteProvider,
  SearxngProvider,
  WikipediaOpenSearchProvider,
};
