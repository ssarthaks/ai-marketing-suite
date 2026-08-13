import { z } from "zod";

import { TONES } from "@/lib/constants";

/**
 * AI Studio owns one-off standalone assets only. Organic social posts, email
 * sequences, research, audits, repurposing plans, and battlecards belong to
 * their dedicated tools.
 */
export const STUDIO_CONTENT_TYPES = [
  "BLOG_POST",
  "GOOGLE_ADS",
  "META_ADS",
  "LANDING_PAGE_COPY",
  "CTA",
  "SEO_META",
  "KEYWORDS",
  "YOUTUBE_SCRIPT",
  "PRESS_RELEASE",
] as const;

export type StudioContentType = (typeof STUDIO_CONTENT_TYPES)[number];

export const generateContentSchema = z
  .object({
    type: z.enum(STUDIO_CONTENT_TYPES),
    tone: z.enum(TONES),
    audience: z.string().trim().max(200, "Keep it under 200 characters"),
    goal: z.string().trim().max(200, "Keep it under 200 characters"),
    prompt: z
      .string()
      .trim()
      .min(10, "Describe what you want in at least 10 characters")
      .max(4000, "Keep the brief under 4000 characters"),
    campaignId: z.string().min(1).max(64).optional(),
    skills: z.array(z.string().min(1).max(64)).max(20).optional(),
    projectKey: z
      .string()
      .min(1)
      .max(64)
      .regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/)
      .optional(),
    visibility: z
      .enum(["PUBLIC", "PRIVATE", "SHARED"])
      .default("PUBLIC")
      .optional(),
    sharedWithUserIds: z.array(z.string().min(1).max(64)).max(50).optional(),
  })
  .strict();

export type GenerateContentInput = z.infer<typeof generateContentSchema>;
