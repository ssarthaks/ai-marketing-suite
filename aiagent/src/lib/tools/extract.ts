import { DEFAULT_EXTRACT_CHARACTERS, MAX_READER_CHARACTERS } from "./constants";
import type { ReaderDependencies } from "./reader";
import { readPageInternal } from "./reader";
import { compactMarkdown, truncateText } from "./text";
import type { ExtractResult } from "./types";
import {
  getToolInput,
  normalizeUrlInput,
  validateInstruction,
} from "./validation";

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "extract",
  "find",
  "for",
  "from",
  "get",
  "give",
  "in",
  "is",
  "me",
  "of",
  "on",
  "only",
  "page",
  "please",
  "section",
  "show",
  "the",
  "this",
  "to",
  "what",
  "with",
]);

const TERM_EXPANSIONS: Record<string, readonly string[]> = {
  price: [
    "price",
    "pricing",
    "cost",
    "plan",
    "plans",
    "tier",
    "billing",
    "subscription",
    "monthly",
    "annual",
    "free",
    "pro",
    "enterprise",
  ],
  pricing: [
    "price",
    "pricing",
    "cost",
    "plan",
    "plans",
    "tier",
    "billing",
    "subscription",
    "monthly",
    "annual",
    "free",
    "pro",
    "enterprise",
  ],
  contact: ["contact", "email", "phone", "address", "support", "sales"],
  feature: ["feature", "features", "capability", "capabilities", "includes"],
  features: ["feature", "features", "capability", "capabilities", "includes"],
  refund: ["refund", "return", "cancellation", "cancel", "money-back"],
  policy: ["policy", "terms", "conditions", "rules", "eligibility"],
};

interface MarkdownSection {
  index: number;
  headingPath: string[];
  lines: string[];
}

interface ScoredSection extends MarkdownSection {
  score: number;
}

interface NormalizedTokenSpan {
  value: string;
  start: number;
}

interface MarkdownBlock {
  index: number;
  lines: string[];
  text: string;
  isTable: boolean;
}

interface InstructionTerms {
  base: ReadonlySet<string>;
  expanded: ReadonlySet<string>;
  phraseTokens: readonly string[];
}

const MAX_SELECTED_SECTIONS = 3;
const MAX_PRIMARY_BLOCK_CHARACTERS = 1_200;
const MAX_ADDITIONAL_BLOCK_CHARACTERS = 700;
const MIN_USEFUL_BLOCK_CHARACTERS = 80;
const BASE_HEADING_TERM_WEIGHT = 12;
const EXPANDED_HEADING_TERM_WEIGHT = 4;
const BASE_BODY_TERM_WEIGHT = 4;
const EXPANDED_BODY_TERM_WEIGHT = 1;
const HEADING_PHRASE_WEIGHT = 30;
const BODY_PHRASE_WEIGHT = 10;
const AMBIGUOUS_PRICING_ALIASES = new Set(["free", "pro"]);
const PRICING_CONTEXT_TERMS = [
  "price",
  "pricing",
  "cost",
  "costs",
  "plan",
  "plans",
  "tier",
  "tiers",
  "billing",
  "subscription",
  "monthly",
  "annual",
  "enterprise",
] as const;

function normalizedTokenSpans(value: string): NormalizedTokenSpan[] {
  const spans: NormalizedTokenSpan[] = [];
  for (const match of value.matchAll(
    /[$€£¥]?\p{N}+(?:[.,]\p{N}+)*|[\p{L}\p{M}\p{N}]+(?:['’][\p{L}\p{M}\p{N}]+)*/gu,
  )) {
    spans.push({
      value: match[0].normalize("NFKC").toLocaleLowerCase(),
      start: match.index,
    });
  }
  return spans;
}

function normalizedTokens(value: string): string[] {
  return normalizedTokenSpans(value).map((token) => token.value);
}

function instructionTerms(instruction: string): InstructionTerms {
  const baseTokens = normalizedTokens(instruction).filter(
    (token) => token.length > 1 && !STOP_WORDS.has(token),
  );
  const base = new Set(baseTokens);
  const expanded = new Set<string>();
  for (const token of baseTokens) {
    for (const related of TERM_EXPANSIONS[token] || []) {
      if (!base.has(related)) expanded.add(related);
    }
  }
  return { base, expanded, phraseTokens: baseTokens };
}

function headingLevel(line: string): number {
  let count = 0;
  while (line[count] === "#" && count < 6) count += 1;
  return count > 0 && line[count] === " " ? count : 0;
}

function splitMarkdownSections(markdown: string): MarkdownSection[] {
  const sections: MarkdownSection[] = [];
  let headingStack: Array<{ level: number; title: string }> = [];
  let current: MarkdownSection = { index: 0, headingPath: [], lines: [] };

  const flush = () => {
    if (current.lines.some((line) => line.trim())) sections.push(current);
  };

  for (const line of markdown.split("\n")) {
    const level = headingLevel(line);
    if (level > 0) {
      flush();
      const heading = line.slice(level + 1).trim();
      headingStack = headingStack.filter((ancestor) => ancestor.level < level);
      headingStack.push({ level, title: heading });
      current = {
        index: sections.length,
        headingPath: headingStack.map(({ title }) => title),
        lines: [line],
      };
    } else {
      current.lines.push(line);
    }
  }
  flush();

  if (sections.length === 0 && markdown.trim()) {
    return [{ index: 0, headingPath: [], lines: [markdown] }];
  }
  return sections;
}

function tokenSequenceOccurrences(
  haystack: readonly string[],
  needle: readonly string[],
): number {
  if (needle.length === 0 || needle.length > haystack.length) return 0;
  let count = 0;
  let position = 0;

  while (position <= haystack.length - needle.length) {
    let matches = true;
    for (let offset = 0; offset < needle.length; offset += 1) {
      if (haystack[position + offset] !== needle[offset]) {
        matches = false;
        break;
      }
    }
    if (matches) {
      count += 1;
      position += needle.length;
    } else {
      position += 1;
    }
  }
  return count;
}

function firstTokenSequencePosition(
  haystack: readonly string[],
  needle: readonly string[],
): number {
  if (needle.length === 0 || needle.length > haystack.length) return -1;
  for (
    let position = 0;
    position <= haystack.length - needle.length;
    position++
  ) {
    let matches = true;
    for (let offset = 0; offset < needle.length; offset += 1) {
      if (haystack[position + offset] !== needle[offset]) {
        matches = false;
        break;
      }
    }
    if (matches) return position;
  }
  return -1;
}

function hasPricingContext(tokens: readonly string[]): boolean {
  return PRICING_CONTEXT_TERMS.some(
    (term) => tokenSequenceOccurrences(tokens, normalizedTokens(term)) > 0,
  );
}

function weightedTermScore(
  tokens: readonly string[],
  terms: InstructionTerms,
  baseWeight: number,
  expandedWeight: number,
): number {
  let score = 0;
  for (const term of terms.base) {
    score +=
      Math.min(tokenSequenceOccurrences(tokens, normalizedTokens(term)), 8) *
      baseWeight;
  }

  const pricingContext = hasPricingContext(tokens);
  for (const term of terms.expanded) {
    if (AMBIGUOUS_PRICING_ALIASES.has(term) && !pricingContext) {
      continue;
    }
    score +=
      Math.min(tokenSequenceOccurrences(tokens, normalizedTokens(term)), 8) *
      expandedWeight;
  }
  return score;
}

function bodyRelevanceScore(value: string, terms: InstructionTerms): number {
  const tokens = normalizedTokens(value);
  let score =
    terms.phraseTokens.length > 0 &&
    tokenSequenceOccurrences(tokens, terms.phraseTokens) > 0
      ? BODY_PHRASE_WEIGHT
      : 0;
  score += weightedTermScore(
    tokens,
    terms,
    BASE_BODY_TERM_WEIGHT,
    EXPANDED_BODY_TERM_WEIGHT,
  );
  return score;
}

function scoreSection(
  section: MarkdownSection,
  terms: InstructionTerms,
): number {
  const headingTokens = normalizedTokens(section.headingPath.join(" "));
  let score = bodyRelevanceScore(section.lines.join("\n"), terms);
  if (
    terms.phraseTokens.length > 0 &&
    tokenSequenceOccurrences(headingTokens, terms.phraseTokens) > 0
  ) {
    score += HEADING_PHRASE_WEIGHT;
  }
  score += weightedTermScore(
    headingTokens,
    terms,
    BASE_HEADING_TERM_WEIGHT,
    EXPANDED_HEADING_TERM_WEIGHT,
  );
  return score;
}

function splitMarkdownBlocks(section: MarkdownSection): MarkdownBlock[] {
  const bodyLines =
    section.lines.length > 0 && headingLevel(section.lines[0]) > 0
      ? section.lines.slice(1)
      : section.lines;
  const blocks: MarkdownBlock[] = [];
  let lines: string[] = [];

  const flush = () => {
    if (lines.length === 0) return;
    const text = lines.join("\n").trim();
    if (text) {
      blocks.push({
        index: blocks.length,
        lines,
        text,
        isTable:
          lines.length >= 2 &&
          lines.every((line) => {
            const trimmed = line.trim();
            return trimmed.startsWith("|") && trimmed.endsWith("|");
          }),
      });
    }
    lines = [];
  };

  for (const line of bodyLines) {
    if (!line.trim()) {
      flush();
    } else {
      lines.push(line);
    }
  }
  flush();
  return blocks;
}

function relevanceAnchor(value: string, terms: InstructionTerms): number {
  const spans = normalizedTokenSpans(value);
  const values = spans.map((span) => span.value);
  const sequences = [
    terms.phraseTokens,
    ...[...terms.base].map((term) => normalizedTokens(term)),
    ...[...terms.expanded]
      .filter(
        (term) =>
          !AMBIGUOUS_PRICING_ALIASES.has(term) || hasPricingContext(values),
      )
      .map((term) => normalizedTokens(term)),
  ];
  for (const sequence of sequences) {
    const tokenPosition = firstTokenSequencePosition(values, sequence);
    if (tokenPosition >= 0) return spans[tokenPosition].start;
  }
  return 0;
}

function textWindowAroundMatch(
  value: string,
  maximum: number,
  terms: InstructionTerms,
): string {
  if (value.length <= maximum) return value;
  if (maximum <= 2) return value.slice(0, maximum);

  const anchor = relevanceAnchor(value, terms);
  const prefix = anchor > 0 ? "…" : "";
  const contentBudget = Math.max(1, maximum - prefix.length - 1);
  let start = Math.max(0, anchor - Math.floor(contentBudget * 0.35));
  let end = Math.min(value.length, start + contentBudget);
  if (end === value.length) start = Math.max(0, end - contentBudget);

  if (start > 0) {
    const nextBoundary = value.slice(start, start + 80).search(/\s/u);
    if (nextBoundary >= 0) start += nextBoundary + 1;
  }
  if (end < value.length) {
    const previousBoundary = value
      .slice(Math.max(start, end - 80), end)
      .search(/\s+\S*$/u);
    if (previousBoundary >= 0) {
      end = Math.max(start, end - 80) + previousBoundary;
    }
  }

  const suffix = end < value.length ? "…" : "";
  return `${start > 0 ? prefix : ""}${value.slice(start, end).trim()}${suffix}`;
}

function tablePassage(
  block: MarkdownBlock,
  maximum: number,
  terms: InstructionTerms,
): string {
  if (block.text.length <= maximum) return block.text;
  if (block.lines.length < 3) {
    return textWindowAroundMatch(block.text, maximum, terms);
  }

  const fixedLines = block.lines.slice(0, 2);
  const dataLines = block.lines.slice(2);
  const rankedDataLines = dataLines
    .map((line, index) => ({
      index,
      score: bodyRelevanceScore(line, terms),
    }))
    .sort(
      (left, right) => right.score - left.score || left.index - right.index,
    );
  const selected = new Set<number>();
  const serialized = () =>
    [
      ...fixedLines,
      ...dataLines.filter((_line, index) => selected.has(index)),
    ].join("\n");

  for (const candidate of rankedDataLines) {
    selected.add(candidate.index);
    if (serialized().length > maximum) selected.delete(candidate.index);
  }
  const result = serialized();
  return result.length <= maximum && selected.size > 0
    ? result
    : textWindowAroundMatch(block.text, maximum, terms);
}

function blockPassage(
  block: MarkdownBlock,
  maximum: number,
  terms: InstructionTerms,
): string {
  return block.isTable
    ? tablePassage(block, maximum, terms)
    : textWindowAroundMatch(block.text, maximum, terms);
}

function focusedSectionPassage(
  section: ScoredSection,
  maximum: number,
  terms: InstructionTerms,
): string {
  const fullSection = compactMarkdown(section.lines.join("\n"));
  if (fullSection.length <= maximum) return fullSection;

  const rawHeading =
    section.lines.length > 0 && headingLevel(section.lines[0]) > 0
      ? section.lines[0].trim()
      : "";
  const headingMaximum = Math.min(300, Math.floor(maximum * 0.25));
  const heading = rawHeading
    ? truncateText(rawHeading, headingMaximum, "…").text
    : "";
  const headingSeparator = heading ? 2 : 0;
  const bodyMaximum = Math.max(1, maximum - heading.length - headingSeparator);
  const blocks = splitMarkdownBlocks(section);
  if (blocks.length === 0) return heading;

  const scoredBlocks = blocks.map((block) => ({
    block,
    score: bodyRelevanceScore(block.text, terms),
  }));
  const focus = [...scoredBlocks].sort(
    (left, right) =>
      right.score - left.score || left.block.index - right.block.index,
  )[0];
  const selected = new Map<number, string>();
  const primaryMaximum = Math.min(bodyMaximum, MAX_PRIMARY_BLOCK_CHARACTERS);
  const primary = blockPassage(focus.block, primaryMaximum, terms);
  selected.set(focus.block.index, primary);
  let usedCharacters = primary.length;

  const candidates = scoredBlocks
    .filter(({ block }) => block.index !== focus.block.index)
    .filter(
      ({ block, score }) =>
        score > 0 ||
        (Math.abs(block.index - focus.block.index) === 1 &&
          (block.isTable || focus.block.isTable)),
    )
    .sort(
      (left, right) =>
        right.score - left.score ||
        Math.abs(left.block.index - focus.block.index) -
          Math.abs(right.block.index - focus.block.index) ||
        left.block.index - right.block.index,
    );

  for (const candidate of candidates) {
    const remaining = bodyMaximum - usedCharacters - 2;
    if (remaining < MIN_USEFUL_BLOCK_CHARACTERS) break;
    const candidateMaximum = Math.min(
      remaining,
      candidate.block.isTable ? remaining : MAX_ADDITIONAL_BLOCK_CHARACTERS,
    );
    const passage = blockPassage(candidate.block, candidateMaximum, terms);
    if (!passage) continue;
    selected.set(candidate.block.index, passage);
    usedCharacters += passage.length + 2;
  }

  const body = [...selected.entries()]
    .sort(([left], [right]) => left - right)
    .map(([, passage]) => passage)
    .join("\n\n");
  return compactMarkdown([heading, body].filter(Boolean).join("\n\n"));
}

function selectRelevantMarkdown(
  markdown: string,
  instruction: string,
): { markdown: string; matched: boolean } {
  const terms = instructionTerms(instruction);
  if (terms.base.size === 0) {
    return { markdown: "", matched: false };
  }
  const sections = splitMarkdownSections(markdown);
  const ranked: ScoredSection[] = sections
    .map((section) => ({
      ...section,
      score: scoreSection(section, terms),
    }))
    .filter((section) => section.score > 0)
    .sort(
      (left, right) => right.score - left.score || left.index - right.index,
    );
  const minimumScore = ranked[0]
    ? Math.ceil(ranked[0].score * 0.6)
    : Number.POSITIVE_INFINITY;
  const scored = ranked
    .filter((section) => section.score >= minimumScore)
    .slice(0, MAX_SELECTED_SECTIONS)
    .sort((left, right) => left.index - right.index);

  if (scored.length === 0) return { markdown: "", matched: false };
  const separatorCharacters = Math.max(0, scored.length - 1) * 2;
  const sectionMaximum = Math.floor(
    (DEFAULT_EXTRACT_CHARACTERS - separatorCharacters) / scored.length,
  );
  return {
    markdown: compactMarkdown(
      scored
        .map((section) => focusedSectionPassage(section, sectionMaximum, terms))
        .join("\n\n"),
    ),
    matched: true,
  };
}

export async function extractTool(
  input: unknown,
  dependencies: ReaderDependencies = {},
): Promise<ExtractResult> {
  const record = getToolInput(input);
  const url = normalizeUrlInput(record.url);
  const instruction = validateInstruction(record.instruction);
  const page = await readPageInternal(
    url,
    { maxCharacters: MAX_READER_CHARACTERS },
    dependencies,
  );
  const selected = selectRelevantMarkdown(page.markdown, instruction);
  const limited = truncateText(selected.markdown, DEFAULT_EXTRACT_CHARACTERS);
  return {
    title: page.title,
    markdown: limited.text,
    metadata: {
      url: page.metadata.url,
      instruction,
      source: page.metadata.source,
      matched: selected.matched,
      truncated: page.metadata.truncated || limited.truncated,
    },
  };
}

export const extractRelevantMarkdown = selectRelevantMarkdown;
