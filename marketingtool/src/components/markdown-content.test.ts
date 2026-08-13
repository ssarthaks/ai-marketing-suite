import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { join } from "node:path";
import test from "node:test";
import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

interface MarkdownFixtureProps {
  content: string;
}

async function loadMarkdownContent(): Promise<
  ComponentType<MarkdownFixtureProps>
> {
  const sourcePath = new URL("./markdown-content.tsx", import.meta.url);
  const originalSource = readFileSync(sourcePath, "utf8");
  const source = originalSource.replace(
    'import { cn } from "@/lib/utils";',
    'const cn = (...values: unknown[]) => values.filter(Boolean).join(" ");',
  );
  assert.notEqual(source, originalSource, "expected to replace the @ alias");

  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: "markdown-content.tsx",
  });

  const temporaryDirectory = mkdtempSync(
    join(process.cwd(), ".markdown-renderer-test-"),
  );
  const compiledPath = join(temporaryDirectory, "markdown-content.mjs");
  writeFileSync(compiledPath, compiled.outputText, "utf8");
  try {
    const loadedModule = (await import(pathToFileURL(compiledPath).href)) as {
      MarkdownContent: ComponentType<MarkdownFixtureProps>;
    };
    return loadedModule.MarkdownContent;
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

const MarkdownContent = await loadMarkdownContent();

function render(content: string): string {
  return renderToStaticMarkup(createElement(MarkdownContent, { content }));
}

test("renders marketing Markdown instead of exposing its syntax", () => {
  const html = render(
    [
      "**The Weak Spot Generator**",
      "",
      "1. Find the weak topic",
      "2. Practise it",
      "",
      "[Open Example](https://example.com/)",
      "",
      "| Day | Action |",
      "| --- | --- |",
      "| 1 | Diagnose |",
    ].join("\n"),
  );

  assert.match(html, /<strong[^>]*>The Weak Spot Generator<\/strong>/);
  assert.match(html, /<ol[^>]*>/);
  assert.match(html, /<li[^>]*>Find the weak topic<\/li>/);
  assert.match(
    html,
    /<a[^>]*href="https:\/\/example\.com\/"[^>]*target="_blank"[^>]*>/,
  );
  assert.match(html, /<table[^>]*>/);
  assert.doesNotMatch(html, /\*\*The Weak Spot Generator\*\*/);
  assert.doesNotMatch(html, /\[Open Example\]\(/);
});

test("blocks raw HTML, unsafe links, and remote image requests", () => {
  const html = render(
    [
      '<script>alert("xss")</script>',
      "[Unsafe](javascript:alert(1))",
      "![Tracking pixel](https://tracker.example/pixel.gif)",
    ].join("\n\n"),
  );

  assert.doesNotMatch(html, /<script|alert\(&quot;xss&quot;\)/);
  assert.doesNotMatch(html, /href="javascript:/);
  assert.doesNotMatch(html, /<img|tracker\.example/);
  assert.match(html, /\[Image omitted: Tracking pixel\]/);
});

test("preserves authored line breaks through the shared preview policy", () => {
  const html = render("First caption line\nSecond caption line");

  assert.match(html, /First caption line\nSecond caption line/);
  assert.match(html, /whitespace-pre-wrap/);
  assert.match(html, /data-markdown-preview="true"/);
});
