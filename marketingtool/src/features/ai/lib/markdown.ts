import {
  getAiRoleContract,
  type AiRoleKind,
} from "./role-contracts.ts";

export type MarkdownPrimitive = string | number | boolean;
export type MarkdownValue =
  | MarkdownPrimitive
  | readonly unknown[]
  | Readonly<Record<string, unknown>>;

export interface MarkdownSection {
  readonly heading: string;
  readonly body: MarkdownValue;
  readonly level?: 2 | 3 | 4;
}

export interface MarkdownDocument {
  readonly title?: string;
  readonly intro?: string;
  readonly sections: readonly MarkdownSection[];
}

export interface BuildAiRoleMarkdownOptions {
  readonly title?: string;
  readonly intro?: string;
  readonly labels?: Readonly<Record<string, string>>;
}

export class MarkdownBuildError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MarkdownBuildError";
  }
}

function singleLine(value: string, label: string): string {
  const normalized = value.trim().split(/\s+/u).filter(Boolean).join(" ");
  if (!normalized) {
    throw new MarkdownBuildError(`${label} cannot be empty.`);
  }
  return normalized;
}

function titleCaseKey(key: string): string {
  const withSpaces = key
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  return withSpaces
    .split(/\s+/u)
    .filter(Boolean)
    .map((part) => part[0].toLocaleUpperCase() + part.slice(1))
    .join(" ");
}

function renderObject(value: Readonly<Record<string, unknown>>): string {
  return Object.entries(value)
    .map(([key, child]) => {
      const label = titleCaseKey(key);
      if (
        typeof child === "string" ||
        typeof child === "number" ||
        typeof child === "boolean"
      ) {
        return `**${label}:** ${String(child).trim()}`;
      }
      return `**${label}:**\n${renderMarkdownValue(child)}`;
    })
    .join("\n\n");
}

export function renderMarkdownValue(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value
      .map((item, index) => {
        if (
          typeof item === "string" ||
          typeof item === "number" ||
          typeof item === "boolean"
        ) {
          return `- ${String(item).trim()}`;
        }
        return `${index + 1}. ${renderMarkdownValue(item)
          .split("\n")
          .join("\n   ")}`;
      })
      .join("\n");
  }
  if (value && typeof value === "object") {
    return renderObject(value as Readonly<Record<string, unknown>>);
  }
  return "";
}

export function buildMarkdownDocument(document: MarkdownDocument): string {
  const blocks: string[] = [];

  if (document.title) {
    blocks.push(`# ${singleLine(document.title, "Markdown title")}`);
  }
  if (document.intro?.trim()) {
    blocks.push(document.intro.trim());
  }

  for (const section of document.sections) {
    const body = renderMarkdownValue(section.body);
    if (!body) {
      throw new MarkdownBuildError(
        `Markdown section "${section.heading}" cannot be empty.`,
      );
    }
    const heading = singleLine(section.heading, "Markdown section heading");
    blocks.push(`${"#".repeat(section.level ?? 2)} ${heading}\n\n${body}`);
  }

  if (blocks.length === 0) {
    throw new MarkdownBuildError(
      "A Markdown document needs a title, intro, or section.",
    );
  }
  return blocks.join("\n\n").trim();
}

/**
 * Builds display Markdown from only the fields owned by the selected role.
 * Foreign metadata and fields are intentionally ignored.
 */
export function buildAiRoleMarkdown(
  kind: AiRoleKind,
  output: Readonly<Record<string, unknown>>,
  options: BuildAiRoleMarkdownOptions = {},
): string {
  const contract = getAiRoleContract(kind);
  const sections = contract.outputKeys.map((key) => {
    if (!Object.prototype.hasOwnProperty.call(output, key)) {
      throw new MarkdownBuildError(
        `Cannot build ${kind} Markdown: missing field "${key}".`,
      );
    }
    return {
      heading: options.labels?.[key] ?? contract.outputLabels[key] ?? key,
      body: output[key] as MarkdownValue,
      level: 2 as const,
    };
  });

  return buildMarkdownDocument({
    title: options.title,
    intro: options.intro,
    sections,
  });
}
