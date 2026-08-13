import { parseHTML } from "linkedom";
import { HTML_REQUEST_HEADERS, MAX_SEARCH_RESULTS } from "./constants";
import { fetchPublicText, type PublicFetch } from "./public-fetch";
import { readPageInternal } from "./reader";
import { searchTool } from "./search";
import {
  compactPlainText,
  normalizePublicResultUrl,
  normalizePlainText,
} from "./text";
import type { RedditComment, RedditDiscussion, SearchResult } from "./types";
import { getToolInput, validateQuery } from "./validation";

const REDDIT_PAGE_CHARACTERS = 10_000;
const MAX_REDDIT_RESPONSE_BYTES = 1_000_000;
const MAX_COMMENTS = 5;
const MAX_COMMENT_CHARACTERS = 700;
const REDDIT_ORIGINS = [
  "https://old.reddit.com",
  "https://www.reddit.com",
  "https://reddit.com",
] as const;

export interface RedditDependencies {
  publicFetch?: PublicFetch;
  useJina?: boolean;
  search?: (query: string) => Promise<SearchResult[]>;
}

function canonicalRedditThreadUrl(value: string): string | null {
  const normalized = normalizePublicResultUrl(value);
  if (!normalized) return null;
  const url = new URL(normalized);
  const hostname = url.hostname.toLowerCase();
  if (
    ![
      "reddit.com",
      "www.reddit.com",
      "old.reddit.com",
      "new.reddit.com",
      "np.reddit.com",
    ].includes(hostname) ||
    url.port ||
    !/^\/r\/[^/]+\/comments\/[^/]+(?:\/|$)/i.test(url.pathname)
  ) {
    return null;
  }
  url.protocol = "https:";
  url.hostname = "www.reddit.com";
  url.search = "";
  url.hash = "";
  return normalizePublicResultUrl(url.toString());
}

function oldRedditUrl(canonicalUrl: string): string {
  const url = new URL(canonicalUrl);
  url.hostname = "old.reddit.com";
  return url.toString();
}

function subredditFromUrl(url: string): string | undefined {
  const segment = new URL(url).pathname.split("/").filter(Boolean)[1];
  return segment ? compactPlainText(segment, 100) : undefined;
}

function optionalText(value: string | null | undefined, limit: number) {
  const text = compactPlainText(value || "", limit);
  return text || undefined;
}

function numericScore(value: string | null | undefined): number | undefined {
  if (!value) return undefined;
  const match = value.replaceAll(",", "").match(/-?\d+/);
  if (!match) return undefined;
  const score = Number(match[0]);
  return Number.isSafeInteger(score) ? score : undefined;
}

function timestampFrom(element: Element): string | undefined {
  return optionalText(
    element.getAttribute("data-timestamp") ||
      element.getAttribute("created-timestamp") ||
      element.querySelector("time")?.getAttribute("datetime"),
    100,
  );
}

function commentFromElement(element: Element): RedditComment | null {
  const body =
    element.querySelector(":scope > .entry .usertext-body .md") ||
    element.querySelector(".usertext-body .md") ||
    element.querySelector("[slot='comment']") ||
    element.querySelector("[data-testid='comment'] p") ||
    element.querySelector("p");
  const text = compactPlainText(
    body?.textContent || "",
    MAX_COMMENT_CHARACTERS,
  );
  if (!text || text === "[deleted]" || text === "[removed]") return null;
  return {
    author: optionalText(
      element.getAttribute("data-author") ||
        element.getAttribute("author") ||
        element.querySelector(".author")?.textContent,
      100,
    ),
    text,
    score: numericScore(
      element.getAttribute("data-score") ||
        element.getAttribute("score") ||
        element.querySelector(".score")?.getAttribute("title") ||
        element.querySelector(".score")?.textContent,
    ),
    timestamp: timestampFrom(element),
  };
}

export function parseRedditHtml(
  html: string,
  canonicalUrl: string,
): RedditDiscussion | null {
  const { document } = parseHTML(html);
  const post =
    document.querySelector(".thing.link") ||
    document.querySelector("shreddit-post") ||
    document.querySelector("article");
  const title = compactPlainText(
    post?.querySelector("a.title")?.textContent ||
      post?.getAttribute("post-title") ||
      document.querySelector("h1")?.textContent ||
      document.querySelector("title")?.textContent ||
      "",
    300,
  );
  if (!title) return null;

  const comments: RedditComment[] = [];
  const commentElements = document.querySelectorAll(
    ".commentarea .thing.comment, shreddit-comment, [data-testid='comment']",
  );
  for (const element of commentElements) {
    const comment = commentFromElement(element);
    if (comment) comments.push(comment);
    if (comments.length >= MAX_COMMENTS) break;
  }

  return {
    title,
    url: canonicalUrl,
    subreddit: optionalText(
      post?.getAttribute("data-subreddit") ||
        post?.getAttribute("subreddit-prefixed")?.replace(/^r\//i, "") ||
        subredditFromUrl(canonicalUrl),
      100,
    ),
    author: optionalText(
      post?.getAttribute("data-author") ||
        post?.getAttribute("author") ||
        post?.querySelector(".author")?.textContent,
      100,
    ),
    score: numericScore(
      post?.getAttribute("data-score") ||
        post?.getAttribute("score") ||
        post?.querySelector(".score")?.getAttribute("title") ||
        post?.querySelector(".score")?.textContent,
    ),
    timestamp: post ? timestampFrom(post) : undefined,
    comments,
  };
}

function discussionFromMarkdown(
  title: string,
  markdown: string,
  url: string,
  author?: string,
  timestamp?: string,
): RedditDiscussion | null {
  const comments: RedditComment[] = [];
  for (const block of markdown.split(/\n{2,}/)) {
    const text = compactPlainText(
      normalizePlainText(block.replace(/^#{1,6}\s+/u, "")),
      MAX_COMMENT_CHARACTERS,
    );
    if (
      text.length < 25 ||
      text === title ||
      /^(log in|sign up|reddit|comments?)$/i.test(text)
    ) {
      continue;
    }
    comments.push({ text });
    if (comments.length >= MAX_COMMENTS) break;
  }
  const normalizedTitle = compactPlainText(title, 300);
  if (!normalizedTitle) return null;
  return {
    title: normalizedTitle,
    url,
    subreddit: subredditFromUrl(url),
    author: optionalText(author, 100),
    timestamp: optionalText(timestamp, 100),
    comments,
  };
}

async function readWithJina(
  url: string,
  dependencies: RedditDependencies,
): Promise<RedditDiscussion | null> {
  if (dependencies.useJina === false) return null;
  try {
    const result = await readPageInternal(
      url,
      { maxCharacters: REDDIT_PAGE_CHARACTERS, useJina: true },
      {
        publicFetch: dependencies.publicFetch,
        useJina: true,
      },
    );
    if (result.metadata.source !== "jina") return null;
    return discussionFromMarkdown(
      result.title,
      result.markdown,
      url,
      result.metadata.byline,
      result.metadata.publishedTime,
    );
  } catch {
    return null;
  }
}

async function readRedditHtml(
  url: string,
  publicFetch?: PublicFetch,
): Promise<RedditDiscussion | null> {
  try {
    const { response, text } = await fetchPublicText(
      url,
      {
        headers: HTML_REQUEST_HEADERS,
        timeoutMs: 7_000,
        maxResponseBytes: MAX_REDDIT_RESPONSE_BYTES,
        maxRedirects: 2,
        allowedRedirectOrigins: REDDIT_ORIGINS,
      },
      publicFetch,
    );
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.toLowerCase().includes("html")) return null;
    const canonical = canonicalRedditThreadUrl(url);
    return canonical ? parseRedditHtml(text, canonical) : null;
  } catch {
    return null;
  }
}

async function readDiscussion(
  canonicalUrl: string,
  dependencies: RedditDependencies,
): Promise<RedditDiscussion | null> {
  const jina = await readWithJina(canonicalUrl, dependencies);
  if (jina?.comments.length) return jina;

  const oldReddit = await readRedditHtml(
    oldRedditUrl(canonicalUrl),
    dependencies.publicFetch,
  );
  if (oldReddit) return oldReddit;

  const currentReddit = await readRedditHtml(
    canonicalUrl,
    dependencies.publicFetch,
  );
  return currentReddit || jina;
}

export async function redditSearchTool(
  input: unknown,
  dependencies: RedditDependencies = {},
): Promise<RedditDiscussion[]> {
  const query = validateQuery(getToolInput(input).query);
  let results: SearchResult[];
  try {
    results = dependencies.search
      ? await dependencies.search(`site:reddit.com ${query}`)
      : await searchTool(
          { query: `site:reddit.com ${query}` },
          { publicFetch: dependencies.publicFetch },
        );
  } catch {
    return [];
  }

  const urls = [
    ...new Set(
      results
        .map((result) => canonicalRedditThreadUrl(result.url))
        .filter((url): url is string => Boolean(url)),
    ),
  ].slice(0, MAX_SEARCH_RESULTS);
  const discussions = await Promise.all(
    urls.map((url) => readDiscussion(url, dependencies)),
  );
  return discussions.filter((discussion): discussion is RedditDiscussion =>
    Boolean(discussion),
  );
}

export const normalizeRedditThreadUrl = canonicalRedditThreadUrl;
