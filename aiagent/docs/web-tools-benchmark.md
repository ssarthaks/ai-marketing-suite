# Web tools benchmark

Run date: 2026-07-27

Command:

```bash
npm run benchmark:web-tools
```

The benchmark is deterministic and offline. It calls no public provider,
DeepSeek, or paid API. It feeds the same logical data to both implementations;
the 15,000-character scenarios extend one recorded fixture with deterministic
irrelevant page text. CPU figures use 100 batches of 20 operations after
warm-up. Payload figures measure serialized tool-result content only—not full
DeepSeek request framing—and estimate tokens as `ceil(characters / 4)`.

## Payload/token comparison

| Scenario                         | Current chars | New chars | Current est. tokens | New est. tokens | Reduction |
| -------------------------------- | ------------: | --------: | ------------------: | --------------: | --------: |
| Search serialization             |         1,114 |       796 |                 279 |             199 |     28.5% |
| Targeted pricing workflow        |        16,371 |     1,251 |               4,093 |             313 |     92.4% |
| Reader cap on the same 15k input |        15,257 |     4,169 |               3,815 |           1,043 |     72.7% |

The pricing row is a modeled workflow comparison: the old agent receives the
whole 15k page, while the new agent uses targeted Extract on that same source.
The Reader row isolates the 4,000-character cap and includes its metadata.

## Repeated context cost

DeepSeek resends earlier tool messages on later agent rounds. If each payload
is present in three subsequent requests:

| Scenario                 | Current est. tokens | New est. tokens |
| ------------------------ | ------------------: | --------------: |
| Search result payload    |                 836 |             597 |
| Specific pricing request |              12,279 |             939 |
| Reader cap               |              11,443 |           3,127 |

This is why targeted extraction matters more than shaving a few keys from the
Search schema.

## Parser reliability fixture

The benchmark checks three equivalent result blocks with changed attribute
order/quotes/nested tags, plus one article-noise check.

| Implementation               | Passed |
| ---------------------------- | -----: |
| Current regex/tag stripping  |  1 / 4 |
| DOM + Readability + Turndown |  4 / 4 |

This is a small characterization suite, not a claim about every website. The
automated test suite separately covers search mapping, Jina fallback, article
noise removal, Markdown tables, targeted extraction, credential-free Reddit
search/HTML fallback, transcript caps, and robots-aware crawling.

## Parser CPU

| Parser                       |      p50 |      p95 |
| ---------------------------- | -------: | -------: |
| Current regex HTML strip     | 0.005 ms | 0.007 ms |
| DOM + Readability + Turndown | 0.532 ms | 0.952 ms |

The robust parser costs about one millisecond on this fixture. That is an
intentional trade: network requests take orders of magnitude longer, while DOM
extraction removes navigation/footer/cookie content and avoids failure when
markup attribute order changes.

## Network latency analysis

Live public-provider latency is deliberately not presented as stable: public
instances have no SLA. The harness instead reports this explicit deterministic
critical-path model (negative delta is faster):

| Modeled path                         | Current |    New |   Delta |
| ------------------------------------ | ------: | -----: | ------: |
| Configured SearXNG succeeds          |  450 ms | 300 ms |  -33.3% |
| First SearXNG outage, Lite succeeds  |  450 ms | 3.30 s | +633.3% |
| All Search timeout budgets exhausted | 24.00 s | 16.0 s |  -33.3% |
| Reader with healthy Jina             |  900 ms | 350 ms |  -61.1% |
| First Reader call during Jina outage |  900 ms | 6.90 s | +666.7% |
| Reader after Jina circuit opens      |  900 ms | 900 ms |      0% |

The outage rows are intentionally shown: the redesign improves common and
worst-case paths, but the first failure can be slower. SearXNG cooldown and the
Jina circuit breaker make subsequent calls avoid repeating those penalties.

The static request-path improvements are still concrete:

- Current Search can wait for three sequential 8-second providers, including
  prohibited Google scraping: 24 seconds of provider timeout budget.
- New Search starts SearXNG and Instant Answer together. Lite is conditional,
  Google is absent, and failed public SearXNG instances enter cooldown.
- Current scraping may retry a page with a changed trailing slash and then a
  guessed `www` host. New local Reader performs one validated page request.
- A Jina failure now falls back locally inside one tool call, avoiding another
  DeepSeek reasoning round.
- Multiple independent tool calls from one model response run concurrently.
- Duplicate calls in one conversation return the cached structured result.

The existing protected fetch performs its own DNS work and redirect checks.
Those security costs are intentionally retained and are not hidden inside the
provider timeout figures.

For a meaningful deployment-specific live p50/p95, run a non-gating smoke test
from the production region against the configured SearXNG instance and target
sites. Do not gate CI on volatile public services.
