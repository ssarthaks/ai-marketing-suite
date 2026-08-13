import { z } from "zod";

export const createLandingPageSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(2, "Title must be at least 2 characters")
      .max(120, "Title must be at most 120 characters"),
    campaignId: z.string().min(1).max(64).optional(),
    visibility: z
      .enum(["PUBLIC", "PRIVATE", "SHARED"])
      .default("PUBLIC")
      .optional(),
    sharedWithUserIds: z
      .array(z.string().min(1).max(64))
      .max(50)
      .optional(),
  })
  .strict();

export type CreateLandingPageInput = z.infer<typeof createLandingPageSchema>;

export const landingPageSettingsSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Title must be at least 2 characters")
    .max(120, "Title must be at most 120 characters"),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "Slug must be at least 3 characters")
    .max(80, "Slug must be at most 80 characters")
    .regex(
      /^[a-z0-9]+(-[a-z0-9]+)*$/,
      "Lowercase letters, numbers, and dashes only"
    ),
  description: z.string().trim().max(500, "Keep it under 500 characters"),
  seoTitle: z.string().trim().max(70, "Keep it under 70 characters"),
  seoDescription: z.string().trim().max(160, "Keep it under 160 characters"),
}).strict();

export type LandingPageSettingsInput = z.infer<
  typeof landingPageSettingsSchema
>;
