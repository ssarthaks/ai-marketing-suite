export const MAX_SEARCH_RESULTS = 5;
export const DEFAULT_READER_CHARACTERS = 4_000;
export const MAX_READER_CHARACTERS = 50_000;
export const DEFAULT_EXTRACT_CHARACTERS = 2_500;
export const MAX_TRANSCRIPT_CHARACTERS = 15_000;
export const MAX_PAGE_RESPONSE_BYTES = 1_000_000;
export const MAX_SEARCH_RESPONSE_BYTES = 512_000;
export const MAX_ROBOTS_RESPONSE_BYTES = 512_000;

export const RESEARCH_USER_AGENT = (
  process.env.WEB_RESEARCH_USER_AGENT?.trim() ||
  "AiAgentResearchBot/1.0 (read-only web research)"
).slice(0, 256);

export const HTML_REQUEST_HEADERS = {
  "User-Agent": RESEARCH_USER_AGENT,
  Accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.2",
  "Accept-Language": "en-US,en;q=0.8",
  "Accept-Encoding": "identity",
} as const;

export const JSON_REQUEST_HEADERS = {
  "User-Agent": RESEARCH_USER_AGENT,
  Accept: "application/json",
  "Accept-Encoding": "identity",
} as const;
