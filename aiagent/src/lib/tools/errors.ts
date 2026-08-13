import type { ToolErrorCode, ToolFailure } from "./types";

export class WebToolError extends Error {
  readonly code: ToolErrorCode;
  readonly retryable: boolean;

  constructor(code: ToolErrorCode, message: string, retryable = false) {
    super(message);
    this.name = "WebToolError";
    this.code = code;
    this.retryable = retryable;
  }
}

export function toToolFailure(error: unknown): ToolFailure {
  if (error instanceof WebToolError) {
    return {
      error: {
        code: error.code,
        message: error.message,
        retryable: error.retryable,
      },
    };
  }

  if (
    error instanceof Error &&
    (error.name === "AbortError" || error.name === "TimeoutError")
  ) {
    return {
      error: {
        code: "TIMEOUT",
        message: "The tool request timed out.",
        retryable: true,
      },
    };
  }

  return {
    error: {
      code: "FETCH_FAILED",
      message: "The requested public content could not be retrieved.",
      retryable: true,
    },
  };
}
