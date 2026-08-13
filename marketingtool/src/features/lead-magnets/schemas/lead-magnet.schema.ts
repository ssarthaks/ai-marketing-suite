import { z } from "zod";
import { LeadMagnetType } from "@prisma/client";

export const leadMagnetFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Title must be at least 2 characters")
    .max(120, "Title must be at most 120 characters"),
  type: z.enum(LeadMagnetType),
  description: z.string().trim().max(500, "Keep it under 500 characters"),
  body: z
    .string()
    .trim()
    .max(20_000, "Content is limited to 20,000 characters"),
  assetId: z.string().min(1).max(64).optional(),
  campaignId: z.string().min(1).max(64).optional(),
  visibility: z.enum(["PUBLIC", "PRIVATE", "SHARED"]).default("PUBLIC").optional(),
  sharedWithUserIds: z
    .array(z.string().min(1).max(64))
    .max(50)
    .optional(),
}).strict();

export type LeadMagnetFormInput = z.infer<typeof leadMagnetFormSchema>;

export const magnetContentSchema = z.object({
  body: z.string().default(""),
});

export const unlockMagnetSchema = z
  .object({
    leadMagnetId: z.string().min(1).max(64),
    email: z.string().trim().toLowerCase().email().max(254),
  })
  .strict();
