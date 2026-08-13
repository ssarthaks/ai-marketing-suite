export type SearchGroup =
  | "campaign"
  | "content"
  | "asset"
  | "landing-page"
  | "lead-magnet";

export interface SearchResult {
  id: string;
  group: SearchGroup;
  title: string;
  subtitle?: string;
  href: string;
}

export const SEARCH_GROUP_LABELS: Record<string, string> = {
  campaign: "Campaigns",
  content: "AI Content",
  asset: "Assets",
  "landing-page": "Landing Pages",
  "lead-magnet": "Lead Magnets",
};
