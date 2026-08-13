import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, test } from "node:test";
import { validatePublicHttpUrl } from "@/lib/safe-fetch";
import type { PublicFetch } from "../public-fetch";
import { fetchPublicText } from "../public-fetch";
import { extractRelevantMarkdown, extractTool } from "../extract";
import { readerTool } from "../reader";
import { extractHtmlToMarkdown } from "../reader/html-to-markdown";
import { parseRedditHtml, redditSearchTool } from "../reddit";
import {
  DuckDuckGoInstantProvider,
  DuckDuckGoLiteProvider,
  SearxngProvider,
  searchTool,
} from "../search";
import { siteCrawlTool } from "../crawl";
import type { SearchProvider } from "../types";
import { youtubeTranscriptTool } from "../youtube";
import { formatToolResult } from "../../utils";

const fixtureDirectory = new URL("../__fixtures__/", import.meta.url);

async function fixture(name: string): Promise<string> {
  return readFile(new URL(name, fixtureDirectory), "utf8");
}

function publicFetchFrom(
  handler: (url: string) => Response | Promise<Response>,
): PublicFetch {
  return (async (url: string) => handler(url)) as PublicFetch;
}

describe("Search", () => {
  test("returns only five deduplicated structured objects", async () => {
    const providers: SearchProvider[] = [
      {
        name: "first",
        async search() {
          return [
            {
              title: "One",
              url: "https://example.com/a?utm_source=test",
              snippet: "First snippet",
            },
            {
              title: "Duplicate",
              url: "https://example.com/a",
              snippet: "Duplicate snippet",
            },
          ];
        },
      },
      {
        name: "second",
        async search() {
          return Array.from({ length: 6 }, (_, index) => ({
            title: `Result ${index}`,
            url: `https://example.com/${index}`,
            snippet: `Snippet ${index}`,
          }));
        },
      },
    ];
    const results = await searchTool(
      { query: "specific query" },
      { providers },
    );
    assert.equal(results.length, 5);
    assert.deepEqual(Object.keys(results[0]).sort(), [
      "snippet",
      "title",
      "url",
    ]);
    assert.equal(
      results.filter((result) => result.url.includes("/a")).length,
      1,
    );
    assert.equal(Array.isArray(results), true);
  });

  test("parses DuckDuckGo Lite with a DOM instead of attribute-sensitive regex", async () => {
    const html = await fixture("ddg-lite.html");
    const provider = new DuckDuckGoLiteProvider(
      publicFetchFrom(
        () =>
          new Response(html, {
            status: 200,
            headers: { "content-type": "text/html" },
          }),
      ),
    );
    const results = await provider.search("guide", 5);
    assert.equal(results.length, 2);
    assert.equal(results[0].title, "Useful Guide");
    assert.equal(results[0].url, "https://example.com/guide");
    assert.match(results[0].snippet, /concise & useful answer/);
  });

  test("maps SearXNG JSON and nested DuckDuckGo Instant Answer topics", async () => {
    const searx = new SearxngProvider({
      instances: ["https://search.example"],
      discover: false,
      publicFetch: publicFetchFrom(
        () =>
          new Response(
            JSON.stringify({
              results: [
                {
                  title: "<b>Acme pricing</b>",
                  url: "https://acme.example/pricing",
                  content: "Plans start at <strong>$9</strong>.",
                },
              ],
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          ),
      ),
    });
    const instant = new DuckDuckGoInstantProvider(
      publicFetchFrom(
        () =>
          new Response(
            JSON.stringify({
              RelatedTopics: [
                {
                  Name: "Group",
                  Topics: [
                    {
                      Text: "Acme - A software company",
                      FirstURL: "https://duckduckgo.com/Acme",
                    },
                  ],
                },
              ],
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          ),
      ),
    );
    assert.deepEqual(await searx.search("acme", 5), [
      {
        title: "Acme pricing",
        url: "https://acme.example/pricing",
        snippet: "Plans start at $9.",
      },
    ]);
    const instantResults = await instant.search("acme", 5);
    assert.equal(instantResults.length, 1);
    assert.equal(instantResults[0].title, "Acme");
  });
});

describe("Reader and Extract", () => {
  test("uses structured Jina output and enforces the 4000 character cap", async () => {
    const publicFetch = publicFetchFrom(
      () =>
        new Response(
          JSON.stringify({
            data: {
              title: "Jina title",
              content: `# Article\n\n${"Useful content. ".repeat(500)}`,
              description: "A useful article",
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
    );
    const result = await readerTool(
      { url: "https://1.1.1.1/article" },
      { publicFetch, useJina: true },
    );
    assert.equal(result.title, "Jina title");
    assert.equal(result.metadata.source, "jina");
    assert.equal(result.metadata.truncated, true);
    assert.ok(result.markdown.length <= 4_000);
  });

  test("falls back to Readability and Turndown without navigation or banners", async () => {
    const html = await fixture("article.html");
    const requested: string[] = [];
    const publicFetch = publicFetchFrom((url) => {
      requested.push(url);
      if (url.startsWith("https://r.jina.ai/")) {
        return new Response("unavailable", { status: 503 });
      }
      return new Response(html, {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    });
    const result = await readerTool(
      { url: "https://1.1.1.1/pricing" },
      { publicFetch, useJina: true },
    );
    assert.ok(requested.some((url) => url.startsWith("https://r.jina.ai/")));
    assert.match(result.markdown, /Acme Cloud/);
    assert.match(result.markdown, /\| Plan \| Monthly price \| Includes \|/);
    assert.match(result.markdown, /https:\/\/1\.1\.1\.1\/signup/);
    assert.doesNotMatch(result.markdown, /Navigation noise/);
    assert.doesNotMatch(result.markdown, /tracking cookie/);
    assert.doesNotMatch(result.markdown, /Footer legal/);
    assert.doesNotMatch(result.markdown, /JavaScript should never appear/);
    assert.ok(result.markdown.length <= 4_000);
  });

  test("returns only pricing sections from a targeted extract", async () => {
    const html = await fixture("article.html");
    const publicFetch = publicFetchFrom(
      () =>
        new Response(html, {
          status: 200,
          headers: { "content-type": "text/html" },
        }),
    );
    const result = await extractTool(
      {
        url: "https://1.1.1.1/pricing",
        instruction: "Extract pricing",
      },
      { publicFetch, useJina: false },
    );
    assert.equal(result.metadata.matched, true);
    assert.match(result.markdown, /\$9/);
    assert.match(result.markdown, /\$29/);
    assert.doesNotMatch(result.markdown, /small design studio/);
    assert.ok(result.markdown.length <= 2_500);
  });

  test("does not match the pricing synonym pro inside longer words", () => {
    const selected = extractRelevantMarkdown(
      [
        "# Product overview",
        "",
        "Professional products provide productive profiles for projects.",
        "",
        "## Cost and plans",
        "",
        "Starter access costs $9 monthly.",
      ].join("\n"),
      "Extract pricing",
    );

    assert.equal(selected.matched, true);
    assert.match(selected.markdown, /## Cost and plans/);
    assert.match(selected.markdown, /\$9 monthly/);
    assert.doesNotMatch(selected.markdown, /Product overview/);
    assert.doesNotMatch(selected.markdown, /Professional products/);
  });

  test("matches an exact short term in a normal heading only", () => {
    const selected = extractRelevantMarkdown(
      [
        "# Product information",
        "",
        "Professional services provide detailed project guidance.",
        "",
        "## Pro",
        "",
        "The Pro tier includes team reporting.",
      ].join("\n"),
      "pro",
    );

    assert.equal(selected.matched, true);
    assert.match(selected.markdown, /^## Pro$/m);
    assert.match(selected.markdown, /Pro tier/);
    assert.doesNotMatch(selected.markdown, /Product information/);
    assert.doesNotMatch(selected.markdown, /Professional services/);
  });

  test("keeps a genuine low-count headingless pricing match", () => {
    const selected = extractRelevantMarkdown(
      "Pricing is $9 monthly.",
      "Extract pricing",
    );

    assert.equal(selected.matched, true);
    assert.equal(selected.markdown, "Pricing is $9 monthly.");
  });

  test("ranks an exact pricing term above an unrelated free alias", () => {
    const selected = extractRelevantMarkdown(
      [
        "# Free learning resources",
        "",
        "Free lessons and free worksheets are available to every learner.",
        "",
        "# Details",
        "",
        "Pricing is $9 monthly.",
      ].join("\n"),
      "Extract pricing",
    );

    assert.equal(selected.matched, true);
    assert.match(selected.markdown, /^# Details$/m);
    assert.match(selected.markdown, /Pricing is \$9 monthly/);
    assert.doesNotMatch(selected.markdown, /Free learning resources/);
    assert.doesNotMatch(selected.markdown, /free worksheets/i);
  });

  test("centers a long section on a late pricing match and nearby table", () => {
    const filler =
      "opening-marker " +
      "Unrelated historical narrative without commercial details. ".repeat(130);
    const selected = extractRelevantMarkdown(
      [
        "# Details",
        "",
        `${filler} Late-match context: Pricing is $9 monthly for Starter.`,
        "",
        "| Plan | Price |",
        "| --- | --- |",
        "| Starter | $9 monthly |",
        "| Pro | $29 monthly |",
      ].join("\n"),
      "Extract pricing",
    );

    assert.equal(selected.matched, true);
    assert.ok(filler.length > 6_000);
    assert.ok(selected.markdown.length <= 2_500);
    assert.match(selected.markdown, /^# Details$/m);
    assert.match(selected.markdown, /Late-match context/);
    assert.match(selected.markdown, /Pricing is \$9 monthly/);
    assert.match(selected.markdown, /\| Plan \| Price \|/);
    assert.match(selected.markdown, /\| Starter \| \$9 monthly \|/);
    assert.doesNotMatch(selected.markdown, /opening-marker/);
  });

  test("keeps signed URLs out of the third-party Jina path", async () => {
    const html = await fixture("article.html");
    const requested: string[] = [];
    const publicFetch = publicFetchFrom((url) => {
      requested.push(url);
      return new Response(html, {
        status: 200,
        headers: { "content-type": "text/html" },
      });
    });
    await readerTool(
      {
        url: "https://1.1.1.1/pricing?X-Amz-Signature=private-signature",
      },
      { publicFetch, useJina: true },
    );
    assert.equal(
      requested.some((url) => url.startsWith("https://r.jina.ai/")),
      false,
    );
  });

  test("bounds adversarially wide and tall HTML tables before Markdown output", () => {
    const cells = Array.from(
      { length: 30 },
      (_, index) => `<td>${index}</td>`,
    ).join("");
    const rows = Array.from({ length: 80 }, () => `<tr>${cells}</tr>`).join("");
    const result = extractHtmlToMarkdown(
      `<html><head><title>Table</title></head><body><main><h1>Table</h1><p>This table contains bounded test data for a safe conversion.</p><table>${rows}</table></main></body></html>`,
      "https://example.com/table",
    );
    assert.ok(result.markdown.length <= 12_500);
    assert.ok(result.markdown.split("\n").length <= 55);
  });
});

describe("Specialized tools", () => {
  test("parses Reddit thread HTML into normalized discussions", () => {
    const discussion = parseRedditHtml(
      `<html><head><title>Fallback title</title></head><body>
        <div class="thing link" data-subreddit="marketing" data-author="researcher" data-score="42">
          <a class="title">A useful discussion</a><time datetime="2026-07-20T12:00:00Z"></time>
        </div>
        <div class="commentarea"><div class="thing comment" data-author="reader" data-score="9">
          <div class="entry"><div class="usertext-body"><div class="md"><p>Useful customer insight.</p></div></div></div>
        </div></div>
      </body></html>`,
      "https://www.reddit.com/r/marketing/comments/abc/useful/",
    );
    assert.ok(discussion);
    assert.equal(discussion.title, "A useful discussion");
    assert.equal(discussion.subreddit, "marketing");
    assert.equal(discussion.author, "researcher");
    assert.equal(discussion.score, 42);
    assert.equal(discussion.comments[0].text, "Useful customer insight.");
    assert.equal(discussion.comments[0].score, 9);
  });

  test("searches the web for threads and retries old Reddit failures", async () => {
    const calls: string[] = [];
    let searchQuery = "";
    const publicFetch = publicFetchFrom((url) => {
      calls.push(url);
      if (url.startsWith("https://old.reddit.com/")) {
        return new Response("blocked", {
          status: 403,
          headers: { "content-type": "text/html" },
        });
      }
      return new Response(
        `<html><body><div class="thing link" data-subreddit="test" data-author="author" data-score="5"><a class="title">Result</a></div><div class="commentarea"><div class="thing comment" data-author="commenter" data-score="2"><div class="usertext-body"><div class="md"><p>Helpful comment text.</p></div></div></div></div></body></html>`,
        { status: 200, headers: { "content-type": "text/html" } },
      );
    });
    const discussions = await redditSearchTool(
      { query: "customer research" },
      {
        useJina: false,
        publicFetch,
        search: async (query) => {
          searchQuery = query;
          return [
            {
              title: "Result",
              url: "https://reddit.com/r/test/comments/abc/result/?utm_source=x",
              snippet: "A discussion",
            },
            {
              title: "Not Reddit",
              url: "https://example.com/",
              snippet: "Ignored",
            },
          ];
        },
      },
    );
    assert.equal(searchQuery, "site:reddit.com customer research");
    assert.equal(discussions.length, 1);
    assert.equal(discussions[0].comments[0].text, "Helpful comment text.");
    assert.equal(calls.length, 2);
    assert.ok(calls[0].startsWith("https://old.reddit.com/"));
    assert.ok(calls[1].startsWith("https://www.reddit.com/"));
  });

  test("caps YouTube transcripts at 15000 characters", async () => {
    const result = await youtubeTranscriptTool(
      { url: "https://youtu.be/dQw4w9WgXcQ" },
      {
        fetchTranscript: async () => [
          {
            text: "word ".repeat(4_000),
            duration: 1,
            offset: 0,
            lang: "en",
          },
        ],
      },
    );
    assert.equal(result.videoId, "dQw4w9WgXcQ");
    assert.equal(result.transcript.length, 15_000);
    assert.equal(result.truncated, true);
    assert.equal(result.language, "en");
  });

  test("rejects transcript-library requests to non-YouTube hosts", async () => {
    await assert.rejects(
      youtubeTranscriptTool(
        { url: "https://youtu.be/dQw4w9WgXcQ" },
        {
          fetchTranscript: async (_url, configuration) => {
            await configuration?.fetch?.(
              "https://youtube.com.attacker.example/",
            );
            return [];
          },
        },
      ),
      (error: unknown) =>
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "PROVIDER_UNAVAILABLE",
    );
  });

  test("crawls same-origin allowed pages and respects robots.txt", async () => {
    const fetched: string[] = [];
    const publicFetch = publicFetchFrom((url) => {
      fetched.push(url);
      if (url.endsWith("/robots.txt")) {
        return new Response("User-agent: *\nAllow: /\nDisallow: /private\n", {
          status: 200,
          headers: { "content-type": "text/plain" },
        });
      }
      if (url.endsWith("/about")) {
        return new Response(
          "<html><head><title>About</title></head><body><main><h1>About us</h1><p>Detailed information about this organization and its public mission for readers.</p></main></body></html>",
          { status: 200, headers: { "content-type": "text/html" } },
        );
      }
      return new Response(
        "<html><head><title>Home</title></head><body><main><h1>Home</h1><p>A sufficiently detailed homepage description for the local reader and crawler test.</p><a href='/about'>About</a><a href='/about#team'>Duplicate</a><a href='/private'>Private</a><a href='https://elsewhere.example/'>Other host</a></main></body></html>",
        { status: 200, headers: { "content-type": "text/html" } },
      );
    });
    const result = await siteCrawlTool(
      { rootUrl: "https://1.1.1.1/", maxDepth: 1, maxPages: 5 },
      { publicFetch },
    );
    assert.deepEqual(
      result.pages.map((page) => page.url),
      ["https://1.1.1.1/", "https://1.1.1.1/about"],
    );
    assert.equal(
      fetched.some((url) => url.endsWith("/private")),
      false,
    );
    assert.equal(
      fetched.some((url) => url.startsWith("https://elsewhere.example")),
      false,
    );
  });
});

test("tool protocol messages are compact valid JSON", () => {
  const result = [
    { title: "Title", url: "https://example.com", snippet: "Text" },
  ];
  const serialized = formatToolResult("search", result);
  assert.deepEqual(JSON.parse(serialized), result);
  assert.equal(serialized.includes("BEGIN UNTRUSTED"), false);
});

test("public URL validation still rejects literal private-network targets", async () => {
  await assert.rejects(validatePublicHttpUrl("http://127.0.0.1/"));
  await assert.rejects(validatePublicHttpUrl("http://[::1]/"));
  await assert.rejects(validatePublicHttpUrl("http://169.254.169.254/"));
});

test("bounded public response reading rejects oversized declared bodies", async () => {
  await assert.rejects(
    fetchPublicText(
      "https://example.com/large",
      { timeoutMs: 100, maxResponseBytes: 10 },
      publicFetchFrom(
        () =>
          new Response("small", {
            status: 200,
            headers: { "content-length": "1000" },
          }),
      ),
    ),
  );
});
