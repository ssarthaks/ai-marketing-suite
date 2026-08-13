import { readTextResponseLimited, safeFetchPublicUrl } from "@/lib/safe-fetch";
import { WebToolError } from "./errors";

export type PublicFetch = typeof safeFetchPublicUrl;

export interface PublicTextRequest {
  headers?: HeadersInit;
  timeoutMs: number;
  maxResponseBytes: number;
  maxRedirects?: number;
  allowedRedirectOrigins?: readonly string[];
  signal?: AbortSignal;
}

export async function fetchPublicText(
  url: string,
  request: PublicTextRequest,
  publicFetch: PublicFetch = safeFetchPublicUrl,
): Promise<{ response: Response; text: string }> {
  const timeoutSignal = AbortSignal.timeout(request.timeoutMs);
  const signal = request.signal
    ? AbortSignal.any([request.signal, timeoutSignal])
    : timeoutSignal;

  let response: Response;
  try {
    response = await publicFetch(
      url,
      {
        headers: request.headers,
        redirect: "manual",
        signal,
      },
      {
        maxRedirects: request.maxRedirects ?? 3,
        timeoutMs: request.timeoutMs,
        maxResponseBytes: request.maxResponseBytes,
        allowedRedirectOrigins: request.allowedRedirectOrigins,
      },
    );
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === "AbortError" ||
        error.name === "TimeoutError" ||
        /timed out|aborted/i.test(error.message))
    ) {
      throw new WebToolError("TIMEOUT", "The public request timed out.", true);
    }
    throw new WebToolError(
      "FETCH_FAILED",
      "The public request could not be completed.",
      true,
    );
  }

  let text: string;
  try {
    text = await readTextResponseLimited(response, request.maxResponseBytes);
  } catch {
    throw new WebToolError(
      "FETCH_FAILED",
      "The public response exceeded its size limit.",
      false,
    );
  }
  return { response, text };
}

export function parseJson<T>(text: string, label: string): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new WebToolError(
      "PROVIDER_UNAVAILABLE",
      `${label} returned invalid JSON.`,
      true,
    );
  }
}
