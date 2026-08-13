export interface SearchInput {
  query: string;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface ReaderInput {
  url: string;
}

export type ReaderSource = "jina" | "readability" | "dom" | "text";

export interface ReaderMetadata {
  url: string;
  source: ReaderSource;
  characters: number;
  truncated: boolean;
  description?: string;
  byline?: string;
  siteName?: string;
  publishedTime?: string;
  language?: string;
  canonicalUrl?: string;
}

export interface ReaderResult {
  title: string;
  markdown: string;
  metadata: ReaderMetadata;
}

export interface ExtractInput {
  url: string;
  instruction: string;
}

export interface ExtractResult {
  title: string;
  markdown: string;
  metadata: {
    url: string;
    instruction: string;
    source: ReaderSource;
    matched: boolean;
    truncated: boolean;
  };
}

export interface RedditSearchInput {
  query: string;
}

export interface RedditComment {
  author?: string;
  text: string;
  score?: number;
  timestamp?: string;
}

export interface RedditDiscussion {
  title: string;
  url: string;
  subreddit?: string;
  author?: string;
  score?: number;
  timestamp?: string;
  comments: RedditComment[];
}

export interface YoutubeTranscriptInput {
  url: string;
  language?: string;
}

export interface YoutubeTranscriptResult {
  videoId: string;
  transcript: string;
  truncated: boolean;
  language?: string;
}

export interface SiteCrawlInput {
  rootUrl: string;
  maxDepth?: number;
  maxPages?: number;
}

export interface CrawledPage {
  url: string;
  depth: number;
  title: string;
  markdown: string;
  metadata: ReaderMetadata;
}

export interface SiteCrawlResult {
  rootUrl: string;
  pages: CrawledPage[];
  skipped: number;
  truncated: boolean;
}

export type ToolErrorCode =
  | "INVALID_INPUT"
  | "NOT_CONFIGURED"
  | "FETCH_FAILED"
  | "PROVIDER_UNAVAILABLE"
  | "UNSUPPORTED_CONTENT"
  | "CONTENT_NOT_FOUND"
  | "ROBOTS_DISALLOWED"
  | "RATE_LIMITED"
  | "TIMEOUT"
  | "CONTENT_TOO_LARGE"
  | "BUDGET_EXHAUSTED";

export interface ToolFailure {
  error: {
    code: ToolErrorCode;
    message: string;
    retryable: boolean;
  };
}

export interface SearchProvider {
  readonly name: string;
  search(query: string, limit: number): Promise<SearchResult[]>;
}
