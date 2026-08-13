import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";
import TurndownService from "turndown";
import {
  compactMarkdown,
  compactPlainText,
  normalizePublicResultUrl,
} from "../text";
import type { ReaderSource } from "../types";

const NOISE_SELECTORS = [
  "script",
  "style",
  "noscript",
  "template",
  "iframe",
  "canvas",
  "svg",
  "nav",
  "footer",
  "aside",
  "form",
  "dialog",
  "[role='navigation']",
  "[role='banner']",
  "[role='complementary']",
  "[aria-modal='true']",
  ".cookie-banner",
  ".cookie-consent",
  ".cookie-notice",
  "#cookie-banner",
  "#cookie-consent",
  "#cookie-notice",
  ".advertisement",
  ".advertising",
  ".ad-container",
  "[data-ad]",
  "ins.adsbygoogle",
] as const;
const MAX_TABLE_ROWS = 50;
const MAX_TABLE_COLUMNS = 12;
const MAX_TABLE_CELL_CHARACTERS = 200;
const MAX_TABLE_MARKDOWN_CHARACTERS = 12_000;

export interface HtmlExtraction {
  title: string;
  markdown: string;
  source: ReaderSource;
  description?: string;
  byline?: string;
  siteName?: string;
  publishedTime?: string;
  language?: string;
  canonicalUrl?: string;
  links: string[];
}

function metaContent(document: Document, selectors: readonly string[]): string {
  for (const selector of selectors) {
    const value = document
      .querySelector(selector)
      ?.getAttribute("content")
      ?.trim();
    if (value) return value;
  }
  return "";
}

function removeNoise(document: Document): void {
  for (const selector of NOISE_SELECTORS) {
    for (const node of document.querySelectorAll(selector)) node.remove();
  }
}

function resolveAttribute(
  element: Element,
  attribute: "href" | "src",
  pageUrl: string,
): void {
  const raw = element.getAttribute(attribute)?.trim();
  if (!raw) {
    element.removeAttribute(attribute);
    return;
  }
  try {
    const resolved = new URL(raw, pageUrl);
    if (!["http:", "https:"].includes(resolved.protocol)) {
      element.removeAttribute(attribute);
      return;
    }
    resolved.hash = "";
    element.setAttribute(attribute, resolved.toString());
  } catch {
    element.removeAttribute(attribute);
  }
}

function normalizeResourceUrls(root: ParentNode, pageUrl: string): void {
  for (const anchor of root.querySelectorAll("a")) {
    resolveAttribute(anchor, "href", pageUrl);
  }
  for (const image of root.querySelectorAll("img")) {
    resolveAttribute(image, "src", pageUrl);
  }
}

function collectLinks(document: Document, pageUrl: string): string[] {
  const links: string[] = [];
  const seen = new Set<string>();
  for (const anchor of document.querySelectorAll("a[href]")) {
    const raw = anchor.getAttribute("href");
    if (!raw) continue;
    const normalized = normalizePublicResultUrl(
      (() => {
        try {
          return new URL(raw, pageUrl).toString();
        } catch {
          return "";
        }
      })(),
    );
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    links.push(normalized);
    if (links.length >= 1_000) break;
  }
  return links;
}

function tableToMarkdown(table: HTMLTableElement): string {
  const rows: string[][] = [];
  for (const rowElement of table.querySelectorAll("tr")) {
    const row: string[] = [];
    for (const cell of rowElement.querySelectorAll("th,td")) {
      row.push(
        compactPlainText(cell.textContent || "", MAX_TABLE_CELL_CHARACTERS)
          .replaceAll("|", "\\|")
          .replaceAll("\n", " "),
      );
      if (row.length >= MAX_TABLE_COLUMNS) break;
    }
    if (row.length > 0) rows.push(row);
    if (rows.length >= MAX_TABLE_ROWS) break;
  }
  if (rows.length === 0) return "";

  const width = Math.max(...rows.map((row) => row.length));
  const normalizedRows = rows.map((row) => [
    ...row,
    ...Array(Math.max(0, width - row.length)).fill(""),
  ]);
  const header = normalizedRows[0];
  const separator = Array(width).fill("---");
  const lines = [`| ${header.join(" | ")} |`, `| ${separator.join(" | ")} |`];
  let totalCharacters = lines.join("\n").length;
  for (const row of normalizedRows.slice(1)) {
    const line = `| ${row.join(" | ")} |`;
    if (totalCharacters + line.length + 1 > MAX_TABLE_MARKDOWN_CHARACTERS) {
      break;
    }
    lines.push(line);
    totalCharacters += line.length + 1;
  }
  return lines.join("\n");
}

function createTurndown(): TurndownService {
  const service = new TurndownService({
    headingStyle: "atx",
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
    emDelimiter: "_",
    strongDelimiter: "**",
  });

  service.remove(["script", "style", "noscript", "iframe", "form", "button"]);
  service.addRule("conciseImages", {
    filter: "img",
    replacement: (_content, node) => {
      const alt = (node as HTMLElement).getAttribute("alt")?.trim();
      return alt ? ` ${compactPlainText(alt, 200)} ` : "";
    },
  });
  service.addRule("markdownTables", {
    filter: "table",
    replacement: (_content, node) =>
      `\n\n${tableToMarkdown(node as HTMLTableElement)}\n\n`,
  });
  return service;
}

function fallbackContent(document: Document): Element | null {
  return (
    document.querySelector("main") ||
    document.querySelector("article") ||
    document.querySelector("[role='main']") ||
    document.body
  );
}

export function htmlFragmentToText(value: string): string {
  const { document } = parseHTML(`<html><body>${value}</body></html>`);
  return compactPlainText(document.body?.textContent || "", 1_000);
}

export function extractHtmlToMarkdown(
  html: string,
  pageUrl: string,
): HtmlExtraction {
  const parsed = parseHTML(html);
  const document = parsed.document as unknown as Document;
  const links = collectLinks(document, pageUrl);

  const documentTitle =
    document.querySelector("title")?.textContent?.trim() ||
    document.querySelector("h1")?.textContent?.trim() ||
    new URL(pageUrl).hostname;
  const description = metaContent(document, [
    "meta[name='description']",
    "meta[property='og:description']",
  ]);
  const canonicalRaw =
    document.querySelector("link[rel='canonical']")?.getAttribute("href") || "";
  let canonicalUrl: string | undefined;
  try {
    canonicalUrl = canonicalRaw
      ? normalizePublicResultUrl(new URL(canonicalRaw, pageUrl).toString()) ||
        undefined
      : undefined;
  } catch {
    canonicalUrl = undefined;
  }

  const documentClone = document.cloneNode(true) as Document;
  removeNoise(documentClone);
  normalizeResourceUrls(documentClone, pageUrl);

  const article = new Readability(documentClone, {
    charThreshold: 80,
    keepClasses: false,
  }).parse();

  let contentRoot: Element | null = null;
  let source: ReaderSource = "dom";
  if (article?.content && (article.textContent || "").trim().length >= 40) {
    const articleDocument = parseHTML(
      `<html><body>${article.content}</body></html>`,
    ).document as unknown as Document;
    contentRoot = articleDocument.body;
    normalizeResourceUrls(contentRoot, pageUrl);
    source = "readability";
  } else {
    contentRoot = fallbackContent(documentClone);
  }

  const markdown = contentRoot
    ? compactMarkdown(
        createTurndown().turndown(contentRoot as unknown as HTMLElement),
      )
    : "";
  const title = compactPlainText(article?.title || documentTitle, 300);

  return {
    title,
    markdown,
    source,
    description:
      compactPlainText(article?.excerpt || description, 500) || undefined,
    byline: compactPlainText(article?.byline || "", 200) || undefined,
    siteName: compactPlainText(article?.siteName || "", 200) || undefined,
    publishedTime:
      compactPlainText(article?.publishedTime || "", 100) || undefined,
    language:
      compactPlainText(
        article?.lang || document.documentElement.getAttribute("lang") || "",
        50,
      ) || undefined,
    canonicalUrl,
    links,
  };
}
