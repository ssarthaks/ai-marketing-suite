import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

/**
 * Parses a Next.js RSC Flight serialization stream payload and extracts the actual return content.
 * If the input doesn't look like a Flight payload, it is returned unmodified.
 */
export function parseFlightResponse(rawText: string): string {
  if (
    !rawText ||
    !rawText.includes(":") ||
    !(rawText.startsWith(":") || /^\d+:/.test(rawText))
  ) {
    return rawText;
  }

  try {
    const chunks: Record<string, unknown> = {};
    const textChunks: Record<string, string> = {};

    let remaining = rawText;
    // Skip optional header lines like :N...
    if (remaining.startsWith(":")) {
      const firstNewline = remaining.indexOf("\n");
      if (firstNewline !== -1) {
        remaining = remaining.slice(firstNewline + 1);
      }
    }

    // Process chunk by chunk
    while (remaining.length > 0) {
      const match = remaining.match(/^(\d+):/);
      if (!match) {
        const nextNewline = remaining.indexOf("\n");
        if (nextNewline === -1) break;
        remaining = remaining.slice(nextNewline + 1);
        continue;
      }

      const id = match[1];
      const headerLength = match[0].length;
      remaining = remaining.slice(headerLength);

      if (remaining.startsWith("T")) {
        // Text chunk: T<hex_len>,<text>
        const lenMatch = remaining.match(/^T([0-9a-fA-F]+),/);
        if (lenMatch) {
          const hexLen = lenMatch[1];
          const len = parseInt(hexLen, 16);
          const textStart = lenMatch[0].length;
          const text = remaining.slice(textStart, textStart + len);
          textChunks[id] = text;
          chunks[id] = text;
          remaining = remaining.slice(textStart + len);
          if (remaining.startsWith("\n")) {
            remaining = remaining.slice(1);
          }
        } else {
          break;
        }
      } else {
        // JSON chunk: <json_object_or_array>
        const nextNewline = remaining.indexOf("\n");
        const jsonStr =
          nextNewline === -1 ? remaining : remaining.slice(0, nextNewline);
        try {
          chunks[id] = JSON.parse(jsonStr);
        } catch {
          chunks[id] = jsonStr;
        }
        remaining = nextNewline === -1 ? "" : remaining.slice(nextNewline + 1);
      }
    }

    let rootObj: Record<string, unknown> | null = null;

    // Look for a chunk with keys "content" or "error"
    for (const key of Object.keys(chunks)) {
      const val = chunks[key];
      if (isRecord(val)) {
        if ("content" in val || "error" in val) {
          rootObj = val;
          break;
        }
      }
    }

    if (!rootObj) {
      for (const key of Object.keys(chunks)) {
        const val = chunks[key];
        if (isRecord(val)) {
          rootObj = val;
          break;
        }
      }
    }

    if (rootObj) {
      const resolved: Record<string, unknown> = { ...rootObj };
      for (const k of Object.keys(resolved)) {
        const val = resolved[k];
        if (typeof val === "string" && val.startsWith("$")) {
          const refId = val.slice(1);
          if (chunks[refId] !== undefined) {
            resolved[k] = chunks[refId];
          }
        }
      }

      if (typeof resolved.content === "string" && resolved.content) {
        return resolved.content;
      }
      if (typeof resolved.error === "string" && resolved.error) {
        return `Error: ${resolved.error}`;
      }
      return JSON.stringify(resolved);
    }

    const textVals = Object.values(textChunks);
    if (textVals.length > 0) {
      return textVals.reduce((a, b) => (a.length > b.length ? a : b));
    }
  } catch {
    console.error("Error parsing server response");
  }

  return rawText;
}

/**
 * Serializes one already-bounded structured tool result at the provider
 * protocol boundary. The system prompt defines the untrusted-data boundary
 * once, avoiding repeated prose around every result.
 */
export function formatToolResult(toolName: string, result: unknown): string {
  void toolName;
  try {
    const serialized = JSON.stringify(result);
    if (serialized.length <= 50_000) return serialized;
    return JSON.stringify({
      error: {
        code: "CONTENT_TOO_LARGE",
        message: "The bounded tool result exceeded the model message limit.",
        retryable: false,
      },
    });
  } catch {
    return JSON.stringify({
      error: {
        code: "CONTENT_TOO_LARGE",
        message: "The tool result could not be serialized.",
        retryable: false,
      },
    });
  }
}

/**
 * Sanitizes model responses to remove any raw JSON tool output that leaked through.
 */
export function sanitizeModelResponse(content: string): string {
  if (!content) return content;
  const boundedContent = content.slice(0, 100_000);

  // If the entire response is a JSON object/array, the model just echoed the tool result
  const trimmed = boundedContent.trim();
  if (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  ) {
    try {
      const parsed = JSON.parse(trimmed);
      // It's valid JSON — the model dumped raw tool output
      if (parsed.content && typeof parsed.content === "string") {
        // Extract readable content if available
        return `Here's what I found:\n\n${parsed.content.substring(0, 2000)}${parsed.content.length > 2000 ? "\n\n*Content was truncated for readability.*" : ""}`;
      }
      if (parsed.url && parsed.content) {
        return `I found information from **${parsed.url}**. Let me analyze it and provide you with key insights. Could you try asking again?`;
      }
      if (parsed.query && parsed.results) {
        return `I found some search results. Let me compile the key findings for you. Could you try asking again?`;
      }
      return "I encountered an issue processing the data. Could you please try your question again?";
    } catch {
      // Not valid JSON, continue
    }
  }

  // Remove inline JSON blobs like {"url":"...","content":"..."} embedded in text
  const cleaned = boundedContent
    .replace(
      /\{"(?:url|query|error|content)":\s*"[^"]*"(?:,\s*"(?:url|query|error|content|results)":\s*(?:"[^"]*"|\[[^\]]*\]))*\}/g,
      "",
    )
    .trim();

  return cleaned || boundedContent;
}
