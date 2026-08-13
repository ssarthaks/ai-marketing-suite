import { z } from "zod";
import { CampaignStatus } from "@prisma/client";

const budgetPattern = /^\d{1,10}(\.\d{1,2})?$/;

export const campaignFormSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(2, "Title must be at least 2 characters")
      .max(120, "Title must be at most 120 characters"),
    description: z.string().trim().max(2000, "Keep it under 2000 characters"),
    audience: z.string().trim().max(200, "Keep it under 200 characters"),
    product: z.string().trim().max(200, "Keep it under 200 characters"),
    objective: z.string().trim().max(200, "Keep it under 200 characters"),
    budget: z
      .string()
      .trim()
      .refine(
        (value) => value === "" || budgetPattern.test(value),
        "Enter a valid amount, e.g. 5000 or 5000.50"
      ),
    selectedProductKey: z
      .string()
      .min(1)
      .max(64)
      .regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/)
      .optional(),
    startDate: z.date().optional(),
    endDate: z.date().optional(),
    status: z.nativeEnum(CampaignStatus),
    visibility: z.enum(["PUBLIC", "PRIVATE", "SHARED"]),
    sharedWithUserIds: z.array(z.string().min(1).max(64)).max(50),
  })
  .strict()
  .refine(
    (data) =>
      !data.startDate || !data.endDate || data.endDate >= data.startDate,
    { message: "End date must be on or after the start date", path: ["endDate"] }
  );

export type CampaignFormInput = z.infer<typeof campaignFormSchema>;

export const campaignNotesSchema = z
  .object({
    notes: z.string().max(20000, "Notes are limited to 20,000 characters"),
  })
  .strict();

export type CampaignNotesInput = z.infer<typeof campaignNotesSchema>;
