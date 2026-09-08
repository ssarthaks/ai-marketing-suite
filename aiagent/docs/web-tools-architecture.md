# Free, modular web research tools

This redesign retains `src/lib/safe-fetch.ts` as the networking foundation.
User-controlled and provider-discovered public URLs still pass through its
existing SSRF checks, DNS validation and pinning, per-hop redirect validation,
timeouts, and response-size limits. The only networking change is a narrow,
optional `allowedRedirectOrigins` policy. Site Crawl uses it so an allowed
same-origin page cannot redirect to an origin whose robots policy was never
checked. Existing callers keep their previous behavior.

The only paid AI endpoint in the active application is DeepSeek. Search,
reading, extraction, Reddit, transcripts, and crawling use free hosted
endpoints or open-source packages. The old Groq title request is now local and
deterministic; dormant Gemini, Groq, OpenAI, and Qwen model adapters and their
AI SDK dependencies were removed.

## Folder structure

```text
src/lib/tools/
├── index.ts                         # public exports and tool registry
├── types.ts                         # all input/output interfaces
├── constants.ts                    # shared caps, headers, user agent
├── errors.ts                       # stable structured tool failures
├── cache.ts                        # canonical in-flight/completed call dedupe
├── validation.ts                   # shared query/URL/input validation
├── public-fetch.ts                 # bounded adapter around safeFetchPublicUrl
├── text.ts                         # dedupe, normalization, truncation
├── search/
│   ├── index.ts                    # provider orchestration
│   ├── searxng.ts                  # configured/public SearXNG JSON
│   ├── duckduckgo-instant.ts       # Instant Answer JSON
│   ├── duckduckgo-lite.ts          # DOM-parsed Lite results
│   ├── wikipedia.ts                # zero-result free fallback
│   └── provider-utils.ts
├── reader/
│   ├── index.ts                    # Jina → local fallback
│   └── html-to-markdown.ts         # Readability + Turndown
├── extract.ts                      # targeted Markdown section ranking
├── reddit.ts                       # Search → Jina/old Reddit HTML adapter
├── youtube.ts                      # bounded youtube-transcript adapter
├── crawl.ts                        # robots-aware, same-origin BFS
├── __fixtures__/
└── __tests__/
```

## Tool contracts

### 1. Search

Input:

```json
{ "query": "Acme product pricing" }
```

Output is only an array, with at most five objects:

```json
[
  {
    "title": "Acme pricing",
    "url": "https://example.com/pricing",
    "snippet": "Plans start at $9 per month."
  }
]
```

Search starts SearXNG and DuckDuckGo Instant Answer concurrently, but preserves
SearXNG results first. If SearXNG supplies all five results, Search returns
without waiting for Instant Answer. It calls DuckDuckGo Lite only if fewer than
five unique results exist. Wikipedia OpenSearch is used only when every general
provider returns zero results. URLs are normalized, tracking parameters are
removed, duplicates are dropped, and every URL/title/snippet is length-capped.

Provider order:

1. Configured or registry-discovered SearXNG JSON
2. DuckDuckGo Instant Answer JSON
3. DuckDuckGo Lite, parsed with Linkedom
4. Wikipedia OpenSearch when no general result exists

Search never imports or invokes Reader. A Search call therefore cannot
silently scrape result pages.

### 2. Reader

Input:

```json
{ "url": "https://example.com/article" }
```

Output:

```json
{
  "title": "Article title",
  "markdown": "# Article title\n\nUseful article text...",
  "metadata": {
    "url": "https://example.com/article",
    "source": "readability",
    "characters": 1834,
    "truncated": false
  }
}
```

Reader validates the target, tries anonymous Jina Reader, and caps the result
at 4,000 characters. Two consecutive Jina failures open a one-minute circuit
breaker so later calls immediately use the local path.

Jina is an external fetch boundary: the application validates the initial URL,
but Jina performs the target DNS lookup and redirect handling on its own
infrastructure. Therefore the application's DNS pinning applies to the request
to `r.jina.ai`, not to Jina's downstream target fetch. URLs with credential-like
query names, nested signed parameters, or high-entropy path tokens bypass Jina
and use the local protected fetch path. `DNT: 1` is sent, but deployments with
strict confidentiality requirements should set `JINA_READER_ENABLED=false`.

The local path:

1. Downloads one bounded page with `safeFetchPublicUrl()`.
2. Parses a real DOM with Linkedom.
3. Removes scripts, styles, navigation, footer, forms, dialogs, conservative
   cookie/ad selectors, and other non-content elements.
4. Extracts the article with Mozilla Readability.
5. Falls back to semantic `main`, `article`, `[role=main]`, or `body` content
   when Readability cannot identify an article.
6. Resolves relative links and converts the DOM to compact Markdown with
   Turndown. A custom table rule preserves pricing/specification tables.

No production Reader or Search code parses HTML with regular expressions.

### 3. Extract

Input:

```json
{
  "url": "https://example.com/pricing",
  "instruction": "Extract pricing"
}
```

Output:

```json
{
  "title": "Plans",
  "markdown": "## Pricing\n\n| Plan | Price |\n| --- | --- |\n| Pro | $29 |",
  "metadata": {
    "url": "https://example.com/pricing",
    "instruction": "Extract pricing",
    "source": "readability",
    "matched": true,
    "truncated": false
  }
}
```

Extract reads up to 50,000 characters internally, splits Markdown by heading
and paragraph/table blocks, expands narrow terms such as
pricing/contact/refund/features, and scores exact Unicode token sequences
instead of substrings. Long passages are windowed around the matching terms,
with nearby headings and relevant table rows retained. It returns at most
2,500 characters and makes no additional model call.

### 4. Reddit Search

Input:

```json
{ "query": "customer complaints about Acme" }
```

Output is an array of at most five `RedditDiscussion` objects with a canonical
thread URL, title, optional subreddit/author/score/timestamp, and up to five
bounded comments with optional author/score/timestamp.

The tool has no Reddit API credentials or OAuth dependency. It searches the
configured free providers for `site:reddit.com <query>`, keeps only canonical
thread URLs, tries Jina Reader when enabled, and then parses Reddit HTML with a
DOM. The direct path prefers `old.reddit.com` and retries the canonical
`www.reddit.com` URL once. A blocked or changed Reddit page is skipped rather
than failing the overall research run.

### 5. YouTube Transcript

Input:

```json
{ "url": "https://www.youtube.com/watch?v=VIDEO_ID", "language": "en" }
```

Output:

```json
{
  "videoId": "VIDEO_ID",
  "transcript": "Transcript text...",
  "truncated": false,
  "language": "en"
}
```

The output is capped at 15,000 characters. The adapter validates YouTube hosts
and video IDs, imposes per-request and whole-operation timeouts, bounds
responses, and routes dynamic YouTube GET requests through
`safeFetchPublicUrl()`. The package's fixed InnerTube POST is separately
allowlisted because the secure fetch layer intentionally permits GET/HEAD only.

`youtube-transcript` is unofficial and can break when YouTube changes its
private interfaces. Automated access also requires a product-owner review of
YouTube's current terms.

### 6. Site Crawl

Input:

```json
{ "rootUrl": "https://example.com", "maxDepth": 1, "maxPages": 5 }
```

The crawler returns structured Markdown pages. It:

- fetches and applies `/robots.txt`;
- stops on robots network/5xx failure, following RFC 9309's conservative rule;
- stays on the exact origin;
- strips fragments/tracking parameters and avoids duplicate/query explosions;
- skips obvious non-HTML assets;
- uses breadth-first traversal with configurable depth (0–3) and pages (1–20);
- honors crawl delay up to five seconds and stops rather than violating longer
  delays;
- has a 60-second whole-crawl deadline;
- processes pages sequentially and caps per-page Markdown, aggregate Markdown,
  and the serialized page array so protocol serialization cannot discard the
  whole result.

Use Site Crawl only for an explicit multi-page request. It is intentionally not
the default research tool.

## Error behavior

Successful tools return the contracts above. Invalid input and provider
failures throw `WebToolError`. The DeepSeek dispatcher converts errors at the
tool protocol boundary into concise JSON:

```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Jina Reader is unavailable.",
    "retryable": true
  }
}
```

One failed parallel tool call does not discard other successful calls.

## Why token use falls

- Search returns objects instead of labels, separators, and prose wrappers.
- Tool messages are serialized once as compact JSON. The old repeated
  `BEGIN/END`, security, and synthesis instructions were removed; the system
  prompt defines that trust boundary once.
- Reader defaults to 4,000 characters instead of the former 8,000/15,000.
- Extract usually returns hundreds of characters instead of an entire page.
- The agent is explicitly told to stop when snippets answer the question.
- Reader and Jina are one tool with an internal fallback, eliminating a second
  LLM tool-selection round after a Jina failure.
- Results are cached within one agent run using canonicalized arguments.
  Simultaneous duplicate calls share one in-flight promise, while retryable
  failures are evicted so a later reasoning step can try again.
- The maximum research loop was reduced from 12 to 8 steps.

Because DeepSeek resends prior tool messages on later reasoning rounds, every
character removed from an early result saves tokens repeatedly.

## Why latency and reliability improve

- SearXNG and Instant Answer start together; later providers are conditional.
- Multiple independent tool calls emitted in one DeepSeek response execute in
  parallel.
- Jina has a short timeout, local fallback, and failure circuit breaker.
- SearXNG registry data is cached in memory.
- Public instance failures receive a cooldown rather than being retried on
  every query.
- Search results and URLs are schema-checked and deduplicated.
- DOM parsing tolerates attribute order, nested markup, and HTML entities.
- Readability removes page chrome more reliably than tag stripping.
- Every network body remains bounded.
- The dispatcher stops tool waits at the research deadline and preserves a
  separate final-synthesis time reserve; Site Crawl also receives the abort
  signal directly.

Public SearXNG has no SLA, JSON may be disabled per instance, DuckDuckGo Lite
has no automation schema, and anonymous Jina is rate-limited. For predictable
production search, point `SEARXNG_INSTANCES` at a free self-hosted SearXNG
deployment. Self-hosting uses open-source software and no paid search API.

## Minimal-token agent calling policy

| Need                      | Call                              | Stop condition                     |
| ------------------------- | --------------------------------- | ---------------------------------- |
| General/current fact      | `search` once with a narrow query | Snippets contain enough evidence   |
| One page field/section    | `extract` directly                | Requested section is returned      |
| Whole article or argument | `reader`                          | 4,000-character Markdown is enough |
| Community evidence        | `redditSearch`                    | Five discussions or fewer          |
| Specific video            | `youtubeTranscript`               | Transcript returned                |
| Explicit site-wide audit  | `siteCrawl`                       | Configured page/depth cap reached  |

Never call Reader merely to “verify” every Search result. Call it only when the
answer depends on details omitted from snippets. For a pricing question, call
Search, choose the canonical pricing URL, then call Extract—not Reader.

## Free setup

```dotenv
SEARXNG_INSTANCES=https://your-public-searxng.example
JINA_READER_ENABLED=true
WEB_RESEARCH_USER_AGENT=AiAgentResearchBot/1.0 (contact: you@example.com)
```

SearXNG may be left empty to use registry discovery. No web-research provider
requires API credentials or paid credits.

## Operational limitations

The protected fetch implementation intentionally buffers bounded bodies before
returning a `Response`. The redesign does not replace that implementation and
therefore does not claim true network-to-model streaming. Memory remains
bounded through response caps, sequential crawl processing, limited link
queues, and truncated tool outputs. Anonymous public SearXNG, DuckDuckGo Lite,
Jina, Reddit, and the unofficial YouTube transcript interface all remain
external operational dependencies without an application-controlled SLA.

Primary references:

- [SearXNG Search API](https://docs.searxng.org/dev/search_api.html)
- [SearXNG public instance registry](https://searx.space/)
- [DuckDuckGo non-JavaScript versions](https://duckduckgo.com/duckduckgo-help-pages/features/non-javascript/)
- [Jina Reader](https://jina.ai/reader/)
- [Mozilla Readability](https://github.com/mozilla/readability)
- [Turndown](https://github.com/mixmark-io/turndown)
- [robots.txt RFC 9309](https://www.rfc-editor.org/rfc/rfc9309.html)
- [youtube-transcript](https://github.com/Kakulukian/youtube-transcript)
