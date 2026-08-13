import { z } from "zod";

export const publicLeadSchema = z
  .object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Enter a valid email")
      .max(254),
    name: z.string().trim().max(120).optional(),
    landingPageId: z.string().min(1).max(64).optional(),
    leadMagnetId: z.string().min(1).max(64).optional(),
  })
  .strict()
  .refine(
    (data) => Boolean(data.landingPageId) !== Boolean(data.leadMagnetId),
    { message: "Provide exactly one capture source" },
  );

export type PublicLeadInput = z.infer<typeof publicLeadSchema>;
