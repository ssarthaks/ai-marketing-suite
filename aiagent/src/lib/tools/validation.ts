import { WebToolError } from "./errors";

export function getToolInput(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new WebToolError("INVALID_INPUT", "Tool input must be an object.");
  }
  return input as Record<string, unknown>;
}

export function validateQuery(value: unknown): string {
  if (typeof value !== "string") {
    throw new WebToolError("INVALID_INPUT", "A search query is required.");
  }
  const query = value.trim();
  if (query.length === 0 || query.length > 300) {
    throw new WebToolError(
      "INVALID_INPUT",
      "The search query must contain 1 to 300 characters.",
    );
  }
  return query;
}

export function validateInstruction(value: unknown): string {
  if (typeof value !== "string") {
    throw new WebToolError(
      "INVALID_INPUT",
      "An extraction instruction is required.",
    );
  }
  const instruction = value.trim();
  if (instruction.length === 0 || instruction.length > 500) {
    throw new WebToolError(
      "INVALID_INPUT",
      "The extraction instruction must contain 1 to 500 characters.",
    );
  }
  return instruction;
}

export function normalizeUrlInput(value: unknown): string {
  if (typeof value !== "string") {
    throw new WebToolError("INVALID_INPUT", "A URL is required.");
  }
  let input = value.trim();
  if (input.length === 0 || input.length > 2_048) {
    throw new WebToolError(
      "INVALID_INPUT",
      "The URL must contain 1 to 2048 characters.",
    );
  }
  if (!input.includes("://")) input = `https://${input}`;

  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new WebToolError("INVALID_INPUT", "The URL is invalid.");
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new WebToolError(
      "INVALID_INPUT",
      "Only HTTP and HTTPS URLs are supported.",
    );
  }
  url.hash = "";
  return url.toString();
}

export function optionalLanguage(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (
    typeof value !== "string" ||
    !/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})?$/.test(value)
  ) {
    throw new WebToolError(
      "INVALID_INPUT",
      "The transcript language is invalid.",
    );
  }
  return value;
}

export function boundedInteger(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  if (value === undefined) return fallback;
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < minimum ||
    value > maximum
  ) {
    throw new WebToolError(
      "INVALID_INPUT",
      `The value must be an integer between ${minimum} and ${maximum}.`,
    );
  }
  return value;
}
