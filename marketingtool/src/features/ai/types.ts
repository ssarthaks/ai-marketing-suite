import type { ContentType } from "@prisma/client";

export interface GeneratedContentDTO {
  id: string;
  title: string;
  type: ContentType;
  content: string;
  tone: string | null;
  audience: string | null;
  goal: string | null;
  prompt: string;
  campaignId: string | null;
  isFavorite: boolean;
  tokensUsed: number | null;
  model: string;
  createdAt: string;
}
