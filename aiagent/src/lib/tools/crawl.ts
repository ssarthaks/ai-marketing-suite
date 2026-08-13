import { validatePublicHttpUrl } from "@/lib/safe-fetch";
import robotsParser from "robots-parser";
import {
  HTML_REQUEST_HEADERS,
  MAX_ROBOTS_RESPONSE_BYTES,
  RESEARCH_USER_AGENT,
} from "./constants";
import { WebToolError } from "./errors";
import { fetchPublicText, type PublicFetch } from "./public-fetch";
import { readLocalPage } from "./reader";
import { normalizePublicResultUrl } from "./text";
import type { SiteCrawlResult } from "./types";
import { boundedInteger, getToolInput, normalizeUrlInput } from "./validation";

const DEFAULT_MAX_DEPTH = 1;
const DEFAULT_MAX_PAGES = 5;
const MAX_DEPTH = 3;
const MAX_PAGES = 20;
const CRAWL_PAGE_CHARACTERS = 3_000;
const MAX_TOTAL_MARKDOWN_CHARACTERS = 30_000;
const MAX_SERIALIZED_PAGE_CHARACTERS = 44_000;
const MAX_ACCEPTED_CRAWL_DELAY_MS = 5_000;
const CRAWL_TOTAL_TIMEOUT_MS = 60_000;
const ROBOTS_USER_AGENT =
  RESEARCH_USER_AGENT.split(/[\s/]/, 1)[0] || "AiAgentResearchBot";

const SKIPPED_EXTENSIONS = new Set([
  "7z",
  "avi",
  "css",
  "csv",
  "doc",
  "docx",
  "exe",
  "gif",
  "gz",
  "ico",
  "jpeg",
  "jpg",
  "js",
  "json",
  "mov",
  "mp3",
  "mp4",
  "mpeg",
  "pdf",
  "png",
  "ppt",
  "pptx",
  "rar",
  "rss",
  "svg",
  "tar",
  "tgz",
  "webm",
  "webp",
  "woff",
  "woff2",
  "xls",
  "xlsx",
  "xml",
  "zip",
]);

interface QueueItem {
  url: string;
  depth: number;
}

interface RobotsPolicy {
  isAllowed(url: string): boolean;
  crawlDelayMs: number;
}

export interface CrawlDependencies {
  publicFetch?: PublicFetch;
  signal?: AbortSignal;
}

function crawlCandidate(rawUrl: string, origin: string): string | null {
  const normalized = normalizePublicResultUrl(rawUrl);
  if (!normalized) return null;
  const url = new URL(normalized);
  if (url.origin !== origin) return null;
  if (url.searchParams.size > 4) return null;
  const segment = url.pathname.split("/").filter(Boolean).at(-1) || "";
  const extension = segment.includes(".")
    ? segment.split(".").at(-1)?.toLowerCase()
    : undefined;
  if (extension && SKIPPED_EXTENSIONS.has(extension)) return null;
  const sortedParameters = [...url.searchParams.entries()].sort(
    ([left], [right]) => left.localeCompare(right),
  );
  url.search = "";
  for (const [name, value] of sortedParameters)
    url.searchParams.append(name, value);
  url.hash = "";
  return url.toString();
}

async function loadRobotsPolicy(
  root: URL,
  publicFetch?: PublicFetch,
  signal?: AbortSignal,
): Promise<RobotsPolicy> {
  const robotsUrl = new URL("/robots.txt", root.origin).toString();
  let response: Response;
  let text: string;
  try {
    const result = await fetchPublicText(
      robotsUrl,
      {
        headers: {
          ...HTML_REQUEST_HEADERS,
          Accept: "text/plain,*/*;q=0.1",
        },
        timeoutMs: 5_000,
        maxResponseBytes: MAX_ROBOTS_RESPONSE_BYTES,
        maxRedirects: 5,
        signal,
      },
      publicFetch,
    );
    response = result.response;
    text = result.text;
  } catch {
    if (signal?.aborted) {
      throw new WebToolError(
        "TIMEOUT",
        "The site crawl timed out while loading robots.txt.",
        true,
      );
    }
    throw new WebToolError(
      "ROBOTS_DISALLOWED",
      "robots.txt could not be reached, so crawling was stopped.",
      true,
    );
  }

  if (response.status >= 500) {
    throw new WebToolError(
      "ROBOTS_DISALLOWED",
      "robots.txt is temporarily unreachable, so crawling was stopped.",
      true,
    );
  }
  if (response.status < 200 || response.status >= 300) {
    return { isAllowed: () => true, crawlDelayMs: 0 };
  }

  const policy = robotsParser(robotsUrl, text);
  const crawlDelaySeconds =
    policy.getCrawlDelay(ROBOTS_USER_AGENT) ?? policy.getCrawlDelay("*") ?? 0;
  const crawlDelayMs = Number.isFinite(crawlDelaySeconds)
    ? Math.max(0, crawlDelaySeconds * 1_000)
    : 0;
  return {
    isAllowed: (url) => policy.isAllowed(url, ROBOTS_USER_AGENT) !== false,
    crawlDelayMs,
  };
}

function wait(milliseconds: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve();
    }, milliseconds);
    const abort = () => {
      clearTimeout(timeout);
      reject(new WebToolError("TIMEOUT", "The site crawl timed out.", true));
    };
    if (signal.aborted) abort();
    else signal.addEventListener("abort", abort, { once: true });
  });
}

export async function siteCrawlTool(
  input: unknown,
  dependencies: CrawlDependencies = {},
): Promise<SiteCrawlResult> {
  const record = getToolInput(input);
  const rootInput = normalizeUrlInput(record.rootUrl);
  const root = await validatePublicHttpUrl(rootInput);
  const maxDepth = boundedInteger(
    record.maxDepth,
    DEFAULT_MAX_DEPTH,
    0,
    MAX_DEPTH,
  );
  const maxPages = boundedInteger(
    record.maxPages,
    DEFAULT_MAX_PAGES,
    1,
    MAX_PAGES,
  );
  const rootUrl = crawlCandidate(root.toString(), root.origin);
  if (!rootUrl) {
    throw new WebToolError("INVALID_INPUT", "The crawl root URL is invalid.");
  }
  const timeoutSignal = AbortSignal.timeout(CRAWL_TOTAL_TIMEOUT_MS);
  const crawlSignal = dependencies.signal
    ? AbortSignal.any([dependencies.signal, timeoutSignal])
    : timeoutSignal;
  const robots = await loadRobotsPolicy(
    root,
    dependencies.publicFetch,
    crawlSignal,
  );
  if (!robots.isAllowed(rootUrl)) {
    throw new WebToolError(
      "ROBOTS_DISALLOWED",
      "robots.txt disallows crawling the root URL.",
    );
  }

  const queue: QueueItem[] = [{ url: rootUrl, depth: 0 }];
  const queued = new Set([rootUrl]);
  const visited = new Set<string>();
  const pathQueryCounts = new Map<string, number>();
  const pages: SiteCrawlResult["pages"] = [];
  let skipped = 0;
  let wasTruncated = false;
  let totalMarkdownCharacters = 0;
  let serializedPageCharacters = 0;
  let lastRequestAt = 0;

  while (queue.length > 0 && pages.length < maxPages) {
    if (crawlSignal.aborted) {
      wasTruncated = true;
      skipped += queue.length;
      break;
    }
    const next = queue.shift()!;
    if (visited.has(next.url)) continue;
    visited.add(next.url);
    if (!robots.isAllowed(next.url)) {
      skipped += 1;
      continue;
    }

    if (robots.crawlDelayMs > MAX_ACCEPTED_CRAWL_DELAY_MS && pages.length > 0) {
      skipped += queue.length + 1;
      wasTruncated = true;
      break;
    }
    const waitFor =
      robots.crawlDelayMs > 0
        ? Math.max(0, lastRequestAt + robots.crawlDelayMs - Date.now())
        : 0;
    if (waitFor > 0) await wait(waitFor, crawlSignal);

    let local;
    lastRequestAt = Date.now();
    try {
      local = await readLocalPage(
        next.url,
        CRAWL_PAGE_CHARACTERS,
        dependencies.publicFetch,
        {
          signal: crawlSignal,
          allowedRedirectOrigins: [root.origin],
        },
      );
    } catch {
      if (crawlSignal.aborted) {
        wasTruncated = true;
        skipped += queue.length + 1;
        break;
      }
      skipped += 1;
      continue;
    }

    if (
      totalMarkdownCharacters + local.reader.markdown.length >
      MAX_TOTAL_MARKDOWN_CHARACTERS
    ) {
      skipped += queue.length + 1;
      wasTruncated = true;
      break;
    }
    const finalPageUrl = local.reader.metadata.url;
    visited.add(finalPageUrl);
    queued.add(finalPageUrl);
    const page: SiteCrawlResult["pages"][number] = {
      url: finalPageUrl,
      depth: next.depth,
      title: local.reader.title,
      markdown: local.reader.markdown,
      metadata: {
        url: finalPageUrl,
        source: local.reader.metadata.source,
        characters: local.reader.metadata.characters,
        truncated: local.reader.metadata.truncated,
      },
    };
    const pageCharacters = JSON.stringify(page).length + 1;
    if (
      serializedPageCharacters + pageCharacters >
      MAX_SERIALIZED_PAGE_CHARACTERS
    ) {
      skipped += queue.length + 1;
      wasTruncated = true;
      break;
    }
    totalMarkdownCharacters += local.reader.markdown.length;
    serializedPageCharacters += pageCharacters;
    pages.push(page);

    if (next.depth >= maxDepth) continue;
    for (const link of local.links) {
      const candidate = crawlCandidate(link, root.origin);
      if (!candidate || queued.has(candidate) || visited.has(candidate))
        continue;
      if (!robots.isAllowed(candidate)) {
        skipped += 1;
        continue;
      }
      const parsed = new URL(candidate);
      const pathKey = parsed.pathname;
      const count = pathQueryCounts.get(pathKey) || 0;
      if (parsed.search && count >= 2) {
        skipped += 1;
        continue;
      }
      if (parsed.search) pathQueryCounts.set(pathKey, count + 1);
      queued.add(candidate);
      queue.push({ url: candidate, depth: next.depth + 1 });
      if (queue.length >= maxPages * 10) break;
    }
  }

  return {
    rootUrl,
    pages,
    skipped,
    truncated: wasTruncated || queue.length > 0,
  };
}
