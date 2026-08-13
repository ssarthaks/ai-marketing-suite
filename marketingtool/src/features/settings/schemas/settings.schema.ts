import { z } from "zod";

import { TONES } from "@/lib/constants";

export const brandProfileSchema = z.object({
  brandName: z.string().trim().max(80, "Keep it under 80 characters").optional(),
  website: z
    .string()
    .trim()
    .url("Enter a valid URL (including https://)")
    .optional()
    .or(z.literal("")),
  industry: z.string().trim().max(80, "Keep it under 80 characters").optional(),
  brandDescription: z
    .string()
    .trim()
    .max(1000, "Keep it under 1000 characters")
    .optional(),
  brandVoice: z
    .string()
    .trim()
    .max(1000, "Keep it under 1000 characters")
    .optional(),
  defaultTone: z.enum(TONES),
});

export type BrandProfileInput = z.infer<typeof brandProfileSchema>;
