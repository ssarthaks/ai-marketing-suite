import { readTextResponseLimited, safeFetchPublicUrl } from "@/lib/safe-fetch";
import { YoutubeTranscript } from "youtube-transcript";
import { MAX_TRANSCRIPT_CHARACTERS } from "./constants";
import { WebToolError } from "./errors";
import type { PublicFetch } from "./public-fetch";
import { compactPlainText, normalizePlainText } from "./text";
import type { YoutubeTranscriptResult } from "./types";
import {
  getToolInput,
  normalizeUrlInput,
  optionalLanguage,
} from "./validation";

const YOUTUBE_REQUEST_TIMEOUT_MS = 8_000;
const YOUTUBE_TOTAL_TIMEOUT_MS = 15_000;
const YOUTUBE_MAX_RESPONSE_BYTES = 1_000_000;
const INNER_TUBE_URL =
  "https://www.youtube.com/youtubei/v1/player?prettyPrint=false";

type TranscriptFetcher = typeof YoutubeTranscript.fetchTranscript;

export interface YoutubeDependencies {
  publicFetch?: PublicFetch;
  trustedFetch?: typeof fetch;
  fetchTranscript?: TranscriptFetcher;
}

function isVideoId(value: string): boolean {
  return /^[A-Za-z0-9_-]{11}$/.test(value);
}

function youtubeVideoId(rawUrl: unknown): { url: string; videoId: string } {
  if (typeof rawUrl !== "string") {
    throw new WebToolError("INVALID_INPUT", "A YouTube URL is required.");
  }
  const trimmed = rawUrl.trim();
  if (isVideoId(trimmed)) {
    return {
      url: `https://www.youtube.com/watch?v=${trimmed}`,
      videoId: trimmed,
    };
  }
  const normalized = normalizeUrlInput(trimmed);
  const url = new URL(normalized);
  if (url.protocol !== "https:" || url.username || url.password || url.port) {
    throw new WebToolError("INVALID_INPUT", "The YouTube URL is invalid.");
  }

  const hostname = url.hostname.toLowerCase();
  let videoId = "";
  if (hostname === "youtu.be") {
    videoId = url.pathname.split("/").filter(Boolean)[0] || "";
  } else if (
    hostname === "youtube.com" ||
    hostname === "www.youtube.com" ||
    hostname === "m.youtube.com"
  ) {
    if (url.pathname === "/watch") {
      videoId = url.searchParams.get("v") || "";
    } else {
      const parts = url.pathname.split("/").filter(Boolean);
      if (["embed", "shorts", "live"].includes(parts[0] || "")) {
        videoId = parts[1] || "";
      }
    }
  }
  if (!isVideoId(videoId)) {
    throw new WebToolError(
      "INVALID_INPUT",
      "The URL does not contain a valid YouTube video ID.",
    );
  }
  return {
    url: `https://www.youtube.com/watch?v=${videoId}`,
    videoId,
  };
}

async function boundedResponse(
  response: Response,
  maximumBytes = YOUTUBE_MAX_RESPONSE_BYTES,
): Promise<Response> {
  const body = await readTextResponseLimited(response, maximumBytes);
  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

function createYoutubeFetch(
  overallSignal: AbortSignal,
  dependencies: YoutubeDependencies,
): typeof fetch {
  const publicFetch = dependencies.publicFetch || safeFetchPublicUrl;
  const trustedFetch = dependencies.trustedFetch || fetch;

  return async (input: URL | RequestInfo, init: RequestInit = {}) => {
    const inputUrl =
      input instanceof Request
        ? input.url
        : input instanceof URL
          ? input.toString()
          : input;
    const url = new URL(inputUrl);
    const method = (
      init.method || (input instanceof Request ? input.method : "GET")
    ).toUpperCase();
    const signal = init.signal
      ? AbortSignal.any([
          overallSignal,
          init.signal,
          AbortSignal.timeout(YOUTUBE_REQUEST_TIMEOUT_MS),
        ])
      : AbortSignal.any([
          overallSignal,
          AbortSignal.timeout(YOUTUBE_REQUEST_TIMEOUT_MS),
        ]);

    if (method === "POST" && url.toString() === INNER_TUBE_URL) {
      const response = await trustedFetch(INNER_TUBE_URL, {
        ...init,
        redirect: "error",
        signal,
      });
      return boundedResponse(response);
    }

    const hostname = url.hostname.toLowerCase();
    if (
      method !== "GET" ||
      (hostname !== "youtube.com" && !hostname.endsWith(".youtube.com")) ||
      url.username ||
      url.password ||
      url.port
    ) {
      throw new WebToolError(
        "INVALID_INPUT",
        "The transcript library attempted an unsupported network request.",
      );
    }
    return publicFetch(
      url.toString(),
      {
        ...init,
        method: "GET",
        redirect: "manual",
        signal,
      },
      {
        maxRedirects: 2,
        timeoutMs: YOUTUBE_REQUEST_TIMEOUT_MS,
        maxResponseBytes: YOUTUBE_MAX_RESPONSE_BYTES,
      },
    );
  };
}

export async function youtubeTranscriptTool(
  input: unknown,
  dependencies: YoutubeDependencies = {},
): Promise<YoutubeTranscriptResult> {
  const record = getToolInput(input);
  const target = youtubeVideoId(record.url);
  const language = optionalLanguage(record.language);
  const overallController = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const transcriptFetcher =
    dependencies.fetchTranscript ||
    YoutubeTranscript.fetchTranscript.bind(YoutubeTranscript);

  let segments: Awaited<ReturnType<TranscriptFetcher>>;
  try {
    const timeoutPromise = new Promise<never>((_resolve, reject) => {
      timeout = setTimeout(() => {
        overallController.abort();
        reject(
          new WebToolError("TIMEOUT", "Transcript request timed out.", true),
        );
      }, YOUTUBE_TOTAL_TIMEOUT_MS);
    });
    segments = await Promise.race([
      transcriptFetcher(target.url, {
        ...(language ? { lang: language } : {}),
        fetch: createYoutubeFetch(overallController.signal, dependencies),
      }),
      timeoutPromise,
    ]);
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === "AbortError" ||
        error.name === "TimeoutError" ||
        /timed out|aborted/i.test(error.message))
    ) {
      throw new WebToolError(
        "TIMEOUT",
        "The YouTube transcript request timed out.",
        true,
      );
    }
    throw new WebToolError(
      "PROVIDER_UNAVAILABLE",
      "The YouTube transcript is unavailable.",
      true,
    );
  } finally {
    if (timeout) clearTimeout(timeout);
  }

  let transcript = "";
  let truncated = false;
  for (const segment of segments) {
    const text = normalizePlainText(segment.text);
    if (!text) continue;
    const separator = transcript ? " " : "";
    const remaining =
      MAX_TRANSCRIPT_CHARACTERS - transcript.length - separator.length;
    if (remaining <= 0) {
      truncated = true;
      break;
    }
    transcript += separator + text.slice(0, remaining);
    if (text.length > remaining) {
      truncated = true;
      break;
    }
  }
  if (!transcript) {
    throw new WebToolError(
      "CONTENT_NOT_FOUND",
      "The video did not expose a usable transcript.",
    );
  }

  return {
    videoId: target.videoId,
    transcript,
    truncated,
    language:
      language ||
      (segments[0]?.lang ? compactPlainText(segments[0].lang, 30) : undefined),
  };
}

export const parseYoutubeVideoId = youtubeVideoId;
