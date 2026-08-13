import { z } from "zod";

import {
  getAiRoleContract,
  type AiRoleKind,
} from "./role-contracts.ts";

export type StrictAiOutputErrorCode =
  | "EMPTY_OUTPUT"
  | "INVALID_CODE_FENCE"
  | "INVALID_JSON"
  | "INVALID_TOP_LEVEL"
  | "MISSING_FIELD"
  | "UNEXPECTED_FIELD"
  | "INVALID_SHAPE"
  | "DUPLICATE_SECTION";

export class StrictAiOutputError extends Error {
  public readonly code: StrictAiOutputErrorCode;
  public readonly details?: unknown;

  constructor(
    code: StrictAiOutputErrorCode,
    message: string,
    details?: unknown,
  ) {
    super(message);
    this.name = "StrictAiOutputError";
    this.code = code;
    this.details = details;
  }
}

export interface DistinctSectionOptions {
  /**
   * Very short values such as "N/A" may legitimately repeat. Only normalized
   * values at least this long are compared. Defaults to 24 characters.
   */
  readonly minimumComparableLength?: number;
}

export interface StrictAiJsonOptions {
  readonly requiredKeys?: readonly string[];
  readonly allowedKeys?: readonly string[];
  readonly sectionKeys?: readonly string[];
  readonly minimumComparableLength?: number;
}

/**
 * Unwraps one complete Markdown JSON fence. Preamble, trailing commentary,
 * unsupported fence languages, and incomplete fences remain invalid.
 */
export function stripMarkdownCodeFence(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new StrictAiOutputError("EMPTY_OUTPUT", "The AI output is empty.");
  }

  if (!trimmed.startsWith("```")) {
    return trimmed;
  }

  const openingLineEnd = trimmed.indexOf("\n");
  const closingLineStart = trimmed.lastIndexOf("\n");
  if (
    openingLineEnd < 0 ||
    closingLineStart <= openingLineEnd ||
    trimmed.slice(closingLineStart + 1).trim() !== "```"
  ) {
    throw new StrictAiOutputError(
      "INVALID_CODE_FENCE",
      "The AI output contains an incomplete Markdown code fence.",
    );
  }

  const opening = trimmed.slice(0, openingLineEnd).trim().toLowerCase();
  if (
    opening !== "```" &&
    opening !== "```json" &&
    opening !== "```application/json"
  ) {
    throw new StrictAiOutputError(
      "INVALID_CODE_FENCE",
      "The AI output must use a JSON Markdown code fence.",
    );
  }

  const body = trimmed.slice(openingLineEnd + 1, closingLineStart).trim();
  if (!body) {
    throw new StrictAiOutputError(
      "EMPTY_OUTPUT",
      "The AI output code fence is empty.",
    );
  }
  return body;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype ||
      Object.getPrototypeOf(value) === null)
  );
}

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableSerialize).join(",")}]`;
  }
  if (isPlainObject(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function normalizeComparableSection(value: unknown): string | null {
  if (value === null || value === undefined) return null;

  const serialized =
    typeof value === "string" ? value : stableSerialize(value);
  const normalized = serialized
    .trim()
    .split(/\s+/u)
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase();

  return normalized || null;
}

/**
 * Prevents a parser fallback from silently putting the same full response in
 * several independent result sections.
 */
export function validateDistinctSections(
  output: Readonly<Record<string, unknown>>,
  sectionKeys: readonly string[],
  options: DistinctSectionOptions = {},
): void {
  const minimumComparableLength = options.minimumComparableLength ?? 24;
  if (
    !Number.isSafeInteger(minimumComparableLength) ||
    minimumComparableLength < 1
  ) {
    throw new RangeError("minimumComparableLength must be a positive integer.");
  }

  const seen = new Map<string, string>();
  for (const key of sectionKeys) {
    const normalized = normalizeComparableSection(output[key]);
    if (!normalized || normalized.length < minimumComparableLength) continue;

    const firstKey = seen.get(normalized);
    if (firstKey) {
      throw new StrictAiOutputError(
        "DUPLICATE_SECTION",
        `AI output sections "${firstKey}" and "${key}" contain identical content.`,
        { firstKey, duplicateKey: key },
      );
    }
    seen.set(normalized, key);
  }
}

function parseJsonObject(raw: string): Record<string, unknown> {
  const jsonText = stripMarkdownCodeFence(raw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    throw new StrictAiOutputError(
      "INVALID_JSON",
      "The AI output is not valid JSON.",
      error,
    );
  }

  if (!isPlainObject(parsed)) {
    throw new StrictAiOutputError(
      "INVALID_TOP_LEVEL",
      "The AI output must be a JSON object.",
    );
  }
  return parsed;
}

export function parseStrictAiJson<T>(
  raw: string,
  schema: z.ZodType<T>,
  options: StrictAiJsonOptions = {},
): T {
  const parsed = parseJsonObject(raw);
  const keys = Object.keys(parsed);

  for (const requiredKey of options.requiredKeys ?? []) {
    if (!Object.prototype.hasOwnProperty.call(parsed, requiredKey)) {
      throw new StrictAiOutputError(
        "MISSING_FIELD",
        `The AI output is missing required field "${requiredKey}".`,
        { field: requiredKey },
      );
    }
  }

  if (options.allowedKeys) {
    const allowed = new Set(options.allowedKeys);
    const unexpectedKey = keys.find((key) => !allowed.has(key));
    if (unexpectedKey) {
      throw new StrictAiOutputError(
        "UNEXPECTED_FIELD",
        `The AI output contains unexpected field "${unexpectedKey}".`,
        { field: unexpectedKey },
      );
    }
  }

  const validated = schema.safeParse(parsed);
  if (!validated.success) {
    throw new StrictAiOutputError(
      "INVALID_SHAPE",
      "The AI output does not match the required schema.",
      validated.error.issues,
    );
  }

  if (options.sectionKeys?.length) {
    if (!isPlainObject(validated.data)) {
      throw new StrictAiOutputError(
        "INVALID_TOP_LEVEL",
        "Distinct sections require a JSON object result.",
      );
    }
    validateDistinctSections(validated.data, options.sectionKeys, {
      minimumComparableLength: options.minimumComparableLength,
    });
  }

  return validated.data;
}

export interface ParseAiRoleOutputOptions extends DistinctSectionOptions {
  /**
   * Overrides the default of checking every role-owned output key.
   * Metadata such as title, token count, raw Markdown, and score is excluded.
   */
  readonly sectionKeys?: readonly string[];
  readonly additionalAllowedKeys?: readonly string[];
}

/**
 * Strictly parses output for one page role. Every owned field is mandatory,
 * fields owned by other roles are rejected, and repeated section bodies fail.
 */
export function parseAiRoleOutput<T>(
  kind: AiRoleKind,
  raw: string,
  schema: z.ZodType<T>,
  options: ParseAiRoleOutputOptions = {},
): T {
  const contract = getAiRoleContract(kind);
  const allowedKeys = [
    ...contract.outputKeys,
    ...contract.metadataKeys,
    ...(options.additionalAllowedKeys ?? []),
  ];

  return parseStrictAiJson(raw, schema, {
    requiredKeys: contract.outputKeys,
    allowedKeys,
    sectionKeys: options.sectionKeys ?? contract.outputKeys,
    minimumComparableLength: options.minimumComparableLength,
  });
}
