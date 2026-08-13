import { extractTool } from "./extract";
import { readerTool } from "./reader";
import { redditSearchTool } from "./reddit";
import { searchTool } from "./search";
import { siteCrawlTool } from "./crawl";
import { youtubeTranscriptTool } from "./youtube";

export { extractTool } from "./extract";
export { readerTool, readLocalPage, readPageInternal } from "./reader";
export { redditSearchTool } from "./reddit";
export { searchTool } from "./search";
export { siteCrawlTool } from "./crawl";
export { youtubeTranscriptTool } from "./youtube";
export { toToolFailure, WebToolError } from "./errors";
export type * from "./types";

export const researchTools = {
  search: searchTool,
  reader: readerTool,
  extract: extractTool,
  redditSearch: redditSearchTool,
  youtubeTranscript: youtubeTranscriptTool,
  siteCrawl: siteCrawlTool,
} as const;
