import { getSafeFetchFinalUrl, validatePublicHttpUrl } from "@/lib/safe-fetch";
import {
  DEFAULT_READER_CHARACTERS,
  HTML_REQUEST_HEADERS,
  MAX_PAGE_RESPONSE_BYTES,
  MAX_READER_CHARACTERS,
  RESEARCH_USER_AGENT,
} from "../constants";
import { WebToolError } from "../errors";
import { fetchPublicText, parseJson, type PublicFetch } from "../public-fetch";
import {
  compactMarkdown,
  compactPlainText,
  isSensitiveUrl,
  truncateText,
} from "../text";
import type { ReaderMetadata, ReaderResult } from "../types";
import { normalizeUrlInput } from "../validation";
import { extractHtmlToMarkdown } from "./html-to-markdown";

const JINA_READER_ORIGIN = "https://r.jina.ai/";
const JINA_TIMEOUT_MS = 6_000;
const LOCAL_READER_TIMEOUT_MS = 10_000;

interface JinaPayload {
  code?: unknown;
  status?: unknown;
  data?: unknown;
}

interface JinaData {
  title?: unknown;
  content?: unknown;
  description?: unknown;
  url?: unknown;
  publishedTime?: unknown;
}

export interface ReaderDependencies {
  publicFetch?: PublicFetch;
  useJina?: boolean;
}

interface InternalReadOptions {
  maxCharacters: number;
  useJina: boolean;
}

export interface LocalPageResult {
  reader: ReaderResult;
  links: string[];
}

export interface LocalPageOptions {
  signal?: AbortSignal;
  maxRedirects?: number;
  allowedRedirectOrigins?: readonly string[];
}

let jinaFailureCount = 0;
let jinaCircuitOpenUntil = 0;

function isJinaEnabled(): boolean {
  return process.env.JINA_READER_ENABLED?.toLowerCase() !== "false";
}

function markJinaSuccess(): void {
  jinaFailureCount = 0;
  jinaCircuitOpenUntil = 0;
}

function markJinaFailure(): void {
  jinaFailureCount += 1;
  if (jinaFailureCount >= 2) {
    jinaCircuitOpenUntil = Date.now() + 60_000;
  }
}

function finalizeReaderResult(
  title: string,
  markdown: string,
  metadata: Omit<ReaderMetadata, "characters" | "truncated">,
  maxCharacters: number,
): ReaderResult {
  const compact = compactMarkdown(markdown);
  const truncated = truncateText(compact, maxCharacters);
  return {
    title: compactPlainText(title, 300) || new URL(metadata.url).hostname,
    markdown: truncated.text,
    metadata: {
      ...metadata,
      characters: truncated.text.length,
      truncated: truncated.truncated,
    },
  };
}

function parseJinaPlainText(text: string): { title: string; markdown: string } {
  const markdownMarker = "\nMarkdown Content:\n";
  const markerIndex = text.indexOf(markdownMarker);
  const content =
    markerIndex >= 0 ? text.slice(markerIndex + markdownMarker.length) : text;
  const firstLines = text.slice(0, Math.max(0, markerIndex)).split("\n");
  const titleLine = firstLines.find((line) => line.startsWith("Title:"));
  const title = titleLine ? titleLine.slice("Title:".length).trim() : "";
  return { title, markdown: content };
}

function jinaDataFromPayload(text: string): JinaData | null {
  if (!text.trimStart().startsWith("{")) return null;
  const payload = parseJson<JinaPayload>(text, "Jina Reader");
  if (
    !payload.data ||
    typeof payload.data !== "object" ||
    Array.isArray(payload.data)
  ) {
    throw new WebToolError(
      "PROVIDER_UNAVAILABLE",
      "Jina Reader returned an unexpected response.",
      true,
    );
  }
  return payload.data as JinaData;
}

async function readWithJina(
  target: URL,
  maxCharacters: number,
  publicFetch: PublicFetch | undefined,
): Promise<ReaderResult> {
  const requestUrl = `${JINA_READER_ORIGIN}${target.toString()}`;
  const { response, text } = await fetchPublicText(
    requestUrl,
    {
      headers: {
        Accept: "application/json, text/plain;q=0.8",
        "User-Agent": RESEARCH_USER_AGENT,
        "X-Robots-Txt": RESEARCH_USER_AGENT,
        "X-Timeout": "5",
        "X-Max-Tokens": String(Math.max(1_024, Math.ceil(maxCharacters / 3))),
        DNT: "1",
      },
      timeoutMs: JINA_TIMEOUT_MS,
      maxResponseBytes: MAX_PAGE_RESPONSE_BYTES,
      maxRedirects: 1,
    },
    publicFetch,
  );
  if (!response.ok) {
    throw new WebToolError(
      response.status === 429 ? "RATE_LIMITED" : "PROVIDER_UNAVAILABLE",
      "Jina Reader is unavailable.",
      true,
    );
  }

  const data = jinaDataFromPayload(text);
  let title = "";
  let markdown = "";
  let description: string | undefined;
  let publishedTime: string | undefined;
  if (data) {
    title = typeof data.title === "string" ? data.title : "";
    markdown = typeof data.content === "string" ? data.content : "";
    description =
      typeof data.description === "string"
        ? compactPlainText(data.description, 500)
        : undefined;
    publishedTime =
      typeof data.publishedTime === "string"
        ? compactPlainText(data.publishedTime, 100)
        : undefined;
  } else {
    const parsed = parseJinaPlainText(text);
    title = parsed.title;
    markdown = parsed.markdown;
  }

  if (compactMarkdown(markdown).length < 40) {
    throw new WebToolError(
      "CONTENT_NOT_FOUND",
      "Jina Reader returned no useful page content.",
      true,
    );
  }
  return finalizeReaderResult(
    title,
    markdown,
    {
      url: target.toString(),
      source: "jina",
      description,
      publishedTime,
    },
    maxCharacters,
  );
}

function titleForTextPage(url: string): string {
  const parsed = new URL(url);
  const lastSegment = parsed.pathname.split("/").filter(Boolean).at(-1);
  return lastSegment ? decodeURIComponent(lastSegment) : parsed.hostname;
}

export async function readLocalPage(
  rawUrl: string,
  maxCharacters = DEFAULT_READER_CHARACTERS,
  publicFetch?: PublicFetch,
  options: LocalPageOptions = {},
): Promise<LocalPageResult> {
  const normalizedUrl = normalizeUrlInput(rawUrl);
  const target = new URL(normalizedUrl);
  const { response, text } = await fetchPublicText(
    target.toString(),
    {
      headers: HTML_REQUEST_HEADERS,
      timeoutMs: LOCAL_READER_TIMEOUT_MS,
      maxResponseBytes: MAX_PAGE_RESPONSE_BYTES,
      maxRedirects: options.maxRedirects ?? 3,
      allowedRedirectOrigins: options.allowedRedirectOrigins,
      signal: options.signal,
    },
    publicFetch,
  );
  const finalUrl = getSafeFetchFinalUrl(response, target.toString());
  if (!response.ok) {
    throw new WebToolError(
      response.status === 429 ? "RATE_LIMITED" : "FETCH_FAILED",
      `The page request failed with HTTP ${response.status}.`,
      response.status === 429 || response.status >= 500,
    );
  }

  const contentType = (response.headers.get("content-type") || "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  if (contentType === "text/plain") {
    const result = finalizeReaderResult(
      titleForTextPage(finalUrl),
      text,
      { url: finalUrl, source: "text" },
      maxCharacters,
    );
    return { reader: result, links: [] };
  }
  if (
    contentType &&
    contentType !== "text/html" &&
    contentType !== "application/xhtml+xml"
  ) {
    throw new WebToolError(
      "UNSUPPORTED_CONTENT",
      `Unsupported page content type: ${contentType}.`,
    );
  }

  const extracted = extractHtmlToMarkdown(text, finalUrl);
  if (!extracted.markdown) {
    throw new WebToolError(
      "CONTENT_NOT_FOUND",
      "The page did not contain readable content.",
    );
  }
  return {
    reader: finalizeReaderResult(
      extracted.title,
      extracted.markdown,
      {
        url: finalUrl,
        source: extracted.source,
        description: extracted.description,
        byline: extracted.byline,
        siteName: extracted.siteName,
        publishedTime: extracted.publishedTime,
        language: extracted.language,
        canonicalUrl: extracted.canonicalUrl,
      },
      Math.min(maxCharacters, MAX_READER_CHARACTERS),
    ),
    links: extracted.links,
  };
}

export async function readPageInternal(
  rawUrl: string,
  options: Partial<InternalReadOptions> = {},
  dependencies: ReaderDependencies = {},
): Promise<ReaderResult> {
  const normalizedUrl = normalizeUrlInput(rawUrl);
  const maxCharacters = Math.min(
    Math.max(options.maxCharacters ?? DEFAULT_READER_CHARACTERS, 500),
    MAX_READER_CHARACTERS,
  );
  const parsedTarget = new URL(normalizedUrl);
  const useJina =
    (options.useJina ?? dependencies.useJina ?? isJinaEnabled()) &&
    !isSensitiveUrl(parsedTarget) &&
    Date.now() >= jinaCircuitOpenUntil;

  if (useJina) {
    const target = await validatePublicHttpUrl(normalizedUrl);
    try {
      const result = await readWithJina(
        target,
        maxCharacters,
        dependencies.publicFetch,
      );
      markJinaSuccess();
      return result;
    } catch {
      markJinaFailure();
    }
  }

  const local = await readLocalPage(
    normalizedUrl,
    maxCharacters,
    dependencies.publicFetch,
  );
  return local.reader;
}

export async function readerTool(
  input: unknown,
  dependencies: ReaderDependencies = {},
): Promise<ReaderResult> {
  const record =
    input && typeof input === "object" && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : {};
  return readPageInternal(normalizeUrlInput(record.url), {}, dependencies);
}
