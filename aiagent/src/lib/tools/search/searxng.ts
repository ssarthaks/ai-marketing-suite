import { JSON_REQUEST_HEADERS, MAX_SEARCH_RESPONSE_BYTES } from "../constants";
import { WebToolError } from "../errors";
import { fetchPublicText, parseJson, type PublicFetch } from "../public-fetch";
import { deduplicateSearchResults } from "../text";
import type { SearchProvider, SearchResult } from "../types";
import { toSearchResult } from "./provider-utils";

const INSTANCE_REGISTRY_URL = "https://searx.space/data/instances.json";
const INSTANCE_CACHE_MS = 60 * 60 * 1_000;
const INSTANCE_FAILURE_COOLDOWN_MS = 5 * 60 * 1_000;

interface SearxResult {
  title?: unknown;
  url?: unknown;
  content?: unknown;
}

interface SearxPayload {
  results?: unknown;
}

interface RegistryPayload {
  instances?: unknown;
}

let cachedInstances: { expiresAt: number; urls: string[] } | null = null;
const unavailableUntil = new Map<string, number>();

function normalizeInstance(value: string): string | null {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || url.username || url.password || url.port) {
      return null;
    }
    url.pathname = url.pathname.replace(/\/+$/, "");
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

function configuredInstances(): string[] {
  return (process.env.SEARXNG_INSTANCES || "")
    .split(",")
    .map(normalizeInstance)
    .filter((value): value is string => Boolean(value));
}

function registryInstanceIsUsable(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return true;
  const record = value as Record<string, unknown>;
  if (record.network_type && record.network_type !== "normal") return false;
  if (record.error) return false;
  if (record.http && typeof record.http === "object") {
    const status = (record.http as Record<string, unknown>).status_code;
    if (typeof status === "number" && status !== 200) return false;
  }
  return true;
}

async function discoverInstances(publicFetch?: PublicFetch): Promise<string[]> {
  if (cachedInstances && cachedInstances.expiresAt > Date.now()) {
    return cachedInstances.urls;
  }
  const { response, text } = await fetchPublicText(
    INSTANCE_REGISTRY_URL,
    {
      headers: JSON_REQUEST_HEADERS,
      timeoutMs: 2_500,
      maxResponseBytes: 1_500_000,
      maxRedirects: 1,
    },
    publicFetch,
  );
  if (!response.ok) return [];
  const payload = parseJson<RegistryPayload>(text, "SearXNG registry");
  if (
    !payload.instances ||
    typeof payload.instances !== "object" ||
    Array.isArray(payload.instances)
  ) {
    return [];
  }
  const urls = Object.entries(payload.instances)
    .filter(([, value]) => registryInstanceIsUsable(value))
    .map(([url]) => normalizeInstance(url))
    .filter((value): value is string => Boolean(value))
    .slice(0, 50);
  cachedInstances = {
    expiresAt: Date.now() + INSTANCE_CACHE_MS,
    urls,
  };
  return urls;
}

function rotateForQuery(urls: readonly string[], query: string): string[] {
  if (urls.length <= 1) return [...urls];
  let hash = 0;
  for (const character of query) {
    hash = (hash * 31 + character.codePointAt(0)!) >>> 0;
  }
  const offset = hash % urls.length;
  return [...urls.slice(offset), ...urls.slice(0, offset)];
}

async function searchInstance(
  baseUrl: string,
  query: string,
  limit: number,
  publicFetch?: PublicFetch,
): Promise<SearchResult[]> {
  const url = new URL(`${baseUrl}/search`);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("language", "en");
  url.searchParams.set("safesearch", "1");
  const { response, text } = await fetchPublicText(
    url.toString(),
    {
      headers: JSON_REQUEST_HEADERS,
      timeoutMs: 3_000,
      maxResponseBytes: MAX_SEARCH_RESPONSE_BYTES,
      maxRedirects: 1,
    },
    publicFetch,
  );
  if (!response.ok) {
    if (
      response.status === 403 ||
      response.status === 429 ||
      response.status >= 500
    ) {
      unavailableUntil.set(baseUrl, Date.now() + INSTANCE_FAILURE_COOLDOWN_MS);
    }
    throw new WebToolError(
      response.status === 429 ? "RATE_LIMITED" : "PROVIDER_UNAVAILABLE",
      "The SearXNG instance is unavailable.",
      response.status === 429 || response.status >= 500,
    );
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("json")) {
    throw new WebToolError(
      "PROVIDER_UNAVAILABLE",
      "The SearXNG instance did not expose its JSON API.",
      true,
    );
  }
  const payload = parseJson<SearxPayload>(text, "SearXNG");
  if (!Array.isArray(payload.results)) {
    throw new WebToolError(
      "PROVIDER_UNAVAILABLE",
      "The SearXNG instance returned an unexpected response.",
      true,
    );
  }
  const results = payload.results.flatMap((raw) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
    const result = raw as SearxResult;
    const mapped = toSearchResult(
      result.title,
      result.url,
      result.content,
      true,
    );
    return mapped ? [mapped] : [];
  });
  return deduplicateSearchResults(results, limit);
}

export class SearxngProvider implements SearchProvider {
  readonly name = "searxng";
  private readonly publicFetch?: PublicFetch;
  private readonly instances?: string[];
  private readonly discover: boolean;

  constructor(
    options: {
      publicFetch?: PublicFetch;
      instances?: string[];
      discover?: boolean;
    } = {},
  ) {
    this.publicFetch = options.publicFetch;
    this.instances = options.instances
      ?.map(normalizeInstance)
      .filter((value): value is string => Boolean(value));
    this.discover = options.discover ?? true;
  }

  async search(query: string, limit: number): Promise<SearchResult[]> {
    const explicit = this.instances ?? configuredInstances();
    let discovered: string[] = [];
    if (explicit.length === 0 && this.discover) {
      try {
        discovered = await discoverInstances(this.publicFetch);
      } catch {
        discovered = [];
      }
    }
    const candidates = rotateForQuery(
      explicit.length > 0 ? explicit : discovered,
      query,
    ).filter((url) => (unavailableUntil.get(url) || 0) <= Date.now());

    let completedRequest = false;
    for (const instance of candidates.slice(0, 2)) {
      try {
        const results = await searchInstance(
          instance,
          query,
          limit,
          this.publicFetch,
        );
        completedRequest = true;
        if (results.length > 0) return results;
      } catch {
        unavailableUntil.set(
          instance,
          Date.now() + INSTANCE_FAILURE_COOLDOWN_MS,
        );
      }
    }
    if (candidates.length === 0 || !completedRequest) {
      throw new WebToolError(
        "PROVIDER_UNAVAILABLE",
        "No usable SearXNG instance is available.",
        true,
      );
    }
    return [];
  }
}
