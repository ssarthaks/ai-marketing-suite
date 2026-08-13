import {
  assertPublicHostname,
  fetchPublicPage,
  parsePublicHttpUrl,
  readResponseText,
} from "../network-security.ts";

// Web search tool using multiple providers with fallback chain
export async function webSearchTool({ query }: { query: string }) {
  const safeQuery = typeof query === "string" ? query.trim() : "";
  if (!safeQuery || safeQuery.length > 300) {
    return { error: "Search query is invalid" };
  }
  const results: string[] = [];
  const seenUrls = new Set<string>();

  const BROWSER_HEADERS = {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
  };

  const addResult = (title: string, url: string, snippet: string) => {
    const cleanUrl = url.trim();
    if (!cleanUrl || seenUrls.has(cleanUrl)) return;
    seenUrls.add(cleanUrl);
    results.push(
      `Title: ${title.trim()}\nURL: ${cleanUrl}\nSnippet: ${snippet.trim()}`,
    );
  };

  try {
    // 1) DuckDuckGo Lite (POST — low-bandwidth text interface, extremely reliable)
    try {
      const ddgLite = await fetch("https://lite.duckduckgo.com/lite/", {
        method: "POST",
        headers: {
          ...BROWSER_HEADERS,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `q=${encodeURIComponent(safeQuery)}`,
        signal: AbortSignal.timeout(5_000),
      });
      if (ddgLite.ok) {
        const html = await readResponseText(ddgLite, 1024 * 1024);
        const regex =
          /<a\s+[^>]*(?:href=["']([^"']+)["'][^>]*class=["']result-link["']|class=["']result-link["'][^>]*href=["']([^"']+)["'])[^>]*>(.*?)<\/a>[\s\S]*?<td[^>]*class=["']result-snippet["'][^>]*>([\s\S]*?)<\/td>/gi;
        let match;
        while ((match = regex.exec(html)) !== null && results.length < 5) {
          let rawUrl = match[1] || match[2];
          if (rawUrl.includes("uddg=")) {
            const matchUddg = rawUrl.match(/uddg=([^&]+)/);
            if (matchUddg) rawUrl = decodeURIComponent(matchUddg[1]);
          }
          if (rawUrl.startsWith("//")) rawUrl = "https:" + rawUrl;
          const title = match[3].replace(/<\/?[^>]+(>|$)/g, "").trim();
          const snippet = match[4].replace(/<\/?[^>]+(>|$)/g, "").trim();
          if (title && snippet) {
            addResult(title, rawUrl, snippet);
          }
        }
      }
    } catch {
      // Continue to fallback
    }

    // 2) DuckDuckGo Lite (GET fallback)
    if (results.length < 3) {
      try {
        const ddgLiteGet = await fetch(
          `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(safeQuery)}`,
          {
            headers: BROWSER_HEADERS,
            signal: AbortSignal.timeout(5_000),
          },
        );
        if (ddgLiteGet.ok) {
          const html = await readResponseText(ddgLiteGet, 1024 * 1024);
          const regex =
            /<a\s+[^>]*(?:href=["']([^"']+)["'][^>]*class=["']result-link["']|class=["']result-link["'][^>]*href=["']([^"']+)["'])[^>]*>(.*?)<\/a>[\s\S]*?<td[^>]*class=["']result-snippet["'][^>]*>([\s\S]*?)<\/td>/gi;
          let match;
          while ((match = regex.exec(html)) !== null && results.length < 5) {
            let rawUrl = match[1] || match[2];
            if (rawUrl.includes("uddg=")) {
              const matchUddg = rawUrl.match(/uddg=([^&]+)/);
              if (matchUddg) rawUrl = decodeURIComponent(matchUddg[1]);
            }
            if (rawUrl.startsWith("//")) rawUrl = "https:" + rawUrl;
            const title = match[3].replace(/<\/?[^>]+(>|$)/g, "").trim();
            const snippet = match[4].replace(/<\/?[^>]+(>|$)/g, "").trim();
            if (title && snippet) {
              addResult(title, rawUrl, snippet);
            }
          }
        }
      } catch {
        // Continue
      }
    }

    // 3) DuckDuckGo Standard HTML search
    if (results.length < 3) {
      try {
        const ddgHtml = await fetch(
          `https://html.duckduckgo.com/html/?q=${encodeURIComponent(safeQuery)}`,
          {
            method: "POST",
            headers: {
              ...BROWSER_HEADERS,
              "Content-Type": "application/x-www-form-urlencoded",
              Referer: "https://html.duckduckgo.com/",
            },
            body: `q=${encodeURIComponent(safeQuery)}`,
            signal: AbortSignal.timeout(5_000),
          },
        );
        if (ddgHtml.ok) {
          const html = await readResponseText(ddgHtml, 1024 * 1024);
          const blockRegex =
            /<a\s+[^>]*(?:href=["']([^"']+)["'][^>]*class=["']result__a["']|class=["']result__a["'][^>]*href=["']([^"']+)["'])[^>]*>(.*?)<\/a>[\s\S]*?<(?:span|div|td|a)[^>]*class=["']result__snippet["'][^>]*>([\s\S]*?)<\/(?:span|div|td|a)>/gi;
          let blockMatch;
          while (
            (blockMatch = blockRegex.exec(html)) !== null &&
            results.length < 5
          ) {
            let url = blockMatch[1] || blockMatch[2];
            if (url.includes("uddg=")) {
              const m = url.match(/uddg=([^&]+)/);
              if (m) url = decodeURIComponent(m[1]);
            }
            const title = blockMatch[3].replace(/<\/?[^>]+(>|$)/g, "").trim();
            const snippet = blockMatch[4].replace(/<\/?[^>]+(>|$)/g, "").trim();
            if (title && snippet) {
              addResult(title, url, snippet);
            }
          }
        }
      } catch {
        // Continue
      }
    }

    // 4) SearXNG Public Instances Registry Fallback
    if (results.length < 3) {
      try {
        const registryRes = await fetch(
          "https://searx.space/data/instances.json",
          { signal: AbortSignal.timeout(2_500) },
        );
        if (registryRes.ok) {
          const regText = await readResponseText(registryRes, 1500 * 1024);
          const regData = JSON.parse(regText) as any;
          const instances = Object.keys(regData.instances || {}).slice(0, 5);
          for (const instUrl of instances) {
            try {
              const sRes = await fetch(
                `${instUrl}/search?q=${encodeURIComponent(safeQuery)}&format=json`,
                { signal: AbortSignal.timeout(3_000) },
              );
              if (sRes.ok) {
                const sText = await readResponseText(sRes, 1024 * 1024);
                const sJson = JSON.parse(sText) as any;
                if (Array.isArray(sJson.results)) {
                  for (const item of sJson.results) {
                    if (results.length >= 5) break;
                    if (item.title && item.url && item.content) {
                      addResult(
                        String(item.title).replace(/<\/?[^>]+(>|$)/g, ""),
                        String(item.url),
                        String(item.content).replace(/<\/?[^>]+(>|$)/g, ""),
                      );
                    }
                  }
                  if (results.length >= 3) break;
                }
              }
            } catch {
              // Try next SearXNG instance
            }
          }
        }
      } catch {
        // Continue
      }
    }

    // 5) DuckDuckGo Instant Answer JSON API
    if (results.length < 3) {
      try {
        const ddgApi = await fetch(
          `https://api.duckduckgo.com/?q=${encodeURIComponent(safeQuery)}&format=json&no_html=1&skip_disambig=1`,
          { headers: BROWSER_HEADERS, signal: AbortSignal.timeout(4_000) },
        );
        if (ddgApi.ok) {
          const json = JSON.parse(
            await readResponseText(ddgApi, 512 * 1024),
          ) as any;
          if (json.AbstractText && json.AbstractURL) {
            addResult(
              json.Heading || safeQuery,
              json.AbstractURL,
              json.AbstractText,
            );
          }
          if (json.RelatedTopics) {
            for (const topic of json.RelatedTopics) {
              if (results.length >= 5) break;
              if (topic.Text && topic.FirstURL) {
                addResult(topic.Text.slice(0, 80), topic.FirstURL, topic.Text);
              }
            }
          }
        }
      } catch {
        // Continue
      }
    }

    // 6) Wikipedia OpenSearch Fallback
    if (results.length === 0) {
      try {
        const wikiRes = await fetch(
          `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(safeQuery)}&limit=5&format=json`,
          { signal: AbortSignal.timeout(4_000) },
        );
        if (wikiRes.ok) {
          const json = JSON.parse(
            await readResponseText(wikiRes, 512 * 1024),
          ) as any[];
          const [, titles, snippets, urls] = json;
          if (Array.isArray(titles)) {
            for (let i = 0; i < titles.length; i++) {
              if (titles[i] && urls[i] && snippets[i]) {
                addResult(titles[i], urls[i], snippets[i]);
              }
            }
          }
        }
      } catch {
        // Continue
      }
    }

    // 7) Google Search Scraping (last resort)
    if (results.length === 0) {
      try {
        const googleRes = await fetch(
          `https://www.google.com/search?q=${encodeURIComponent(safeQuery)}&num=5&hl=en`,
          {
            headers: BROWSER_HEADERS,
            redirect: "error",
            signal: AbortSignal.timeout(5_000),
          },
        );
        if (googleRes.ok) {
          const googleHtml = await readResponseText(googleRes, 1024 * 1024);
          const gRegex =
            /<a href="\/url\?q=([^&"]+)[^"]*"[^>]*>[\s\S]*?<\/a>[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/gi;
          let gMatch;
          while (
            (gMatch = gRegex.exec(googleHtml)) !== null &&
            results.length < 5
          ) {
            const gUrl = decodeURIComponent(gMatch[1]);
            const gSnippet = gMatch[2].replace(/<\/?[^>]+(>|$)/g, "").trim();
            if (
              gSnippet &&
              gSnippet.length > 20 &&
              !gUrl.includes("google.com")
            ) {
              addResult(gUrl, gUrl, gSnippet);
            }
          }
        }
      } catch {
        // All providers failed
      }
    }

    return {
      query: safeQuery,
      results:
        results.length > 0
          ? results
          : [
              "Web search could not retrieve results from any provider. The AI will answer based on its training knowledge instead.",
            ],
    };
  } catch (e) {
    return { error: "Search providers were unavailable" };
  }
}

export async function webScrapeTool({ url }: { url: string }) {
  try {
    const BROWSER_HEADERS = {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "identity",
    };

    const response = await fetchPublicPage(url, BROWSER_HEADERS, {
      maxBytes: 2 * 1024 * 1024,
      timeoutMs: 6_000,
      maxRedirects: 2,
    });
    const html = response.body;

    // Remove script and style tags and their contents
    let text = html.replace(
      /<(script|style|noscript|iframe)[^>]*>([\s\S]*?)<\/\1>/gi,
      " ",
    );

    // Remove all HTML tags
    text = text.replace(/<\/?[^>]+(>|$)/g, " ");

    // Decode basic HTML entities
    text = text
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    // Clean up whitespace
    text = text.replace(/\s+/g, " ").trim();

    // Truncate to reasonable length (e.g. 8000 characters)
    const maxLength = 8000;
    if (text.length > maxLength) {
      text = text.substring(0, maxLength) + "... [Truncated]";
    }

    return {
      url: response.url,
      content: text || "Empty page content.",
    };
  } catch {
    return { error: "The requested public page could not be fetched safely" };
  }
}

// -----------------------------------------------------------------------------
// NEW MARKETING TOOLS
// -----------------------------------------------------------------------------

export async function jinaReaderTool({ url }: { url: string }) {
  try {
    const target = parsePublicHttpUrl(url, { allowImplicitHttps: true });
    await assertPublicHostname(target);
    const response = await fetch(
      `https://r.jina.ai/${encodeURI(target.toString())}`,
      {
        headers: {
          Accept: "text/event-stream, application/json, text/plain, */*",
        },
        redirect: "error",
        signal: AbortSignal.timeout(8_000),
      },
    );
    if (!response.ok)
      throw new Error(`Jina Reader failed: ${response.statusText}`);
    const text = await readResponseText(response, 1024 * 1024);
    return { url: target.toString(), content: text.substring(0, 15000) };
  } catch {
    return { error: "The requested public page could not be read safely" };
  }
}

export async function redditSearchTool({ query }: { query: string }) {
  const safeQuery = typeof query === "string" ? query.trim() : "";
  if (!safeQuery || safeQuery.length > 300) {
    return { error: "Search query is invalid" };
  }
  try {
    const response = await fetch(
      `https://www.reddit.com/search.json?q=${encodeURIComponent(safeQuery)}&sort=relevance&limit=5`,
      {
        headers: {
          "User-Agent": "AiAgent Marketing Agent 1.0",
        },
        redirect: "error",
        signal: AbortSignal.timeout(6_000),
      },
    );
    if (!response.ok) throw new Error("Reddit request failed");
    const json = JSON.parse(
      await readResponseText(response, 512 * 1024),
    ) as any;
    const posts = json.data?.children?.map((c: any) => {
      const d = c.data;
      return {
        subreddit: d.subreddit_name_prefixed,
        title: d.title,
        text: d.selftext?.substring(0, 500),
        score: d.score,
        url: `https://reddit.com${d.permalink}`,
      };
    });
    return { posts: posts || [] };
  } catch {
    return { error: "Reddit search was unavailable" };
  }
}

import { YoutubeTranscript } from "youtube-transcript";

export async function youtubeTranscriptTool({ url }: { url: string }) {
  try {
    const target = parsePublicHttpUrl(url);
    const host = target.hostname.toLowerCase();
    if (
      host !== "youtu.be" &&
      host !== "youtube.com" &&
      !host.endsWith(".youtube.com")
    ) {
      return { error: "Only YouTube URLs are supported" };
    }
    await assertPublicHostname(target);
    const transcript = await Promise.race([
      YoutubeTranscript.fetchTranscript(target.toString()),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Transcript timed out")), 8_000),
      ),
    ]);
    const fullText = transcript.map((t) => t.text).join(" ");
    return { text: fullText.substring(0, 15000) };
  } catch {
    return { error: "The YouTube transcript could not be retrieved" };
  }
}
