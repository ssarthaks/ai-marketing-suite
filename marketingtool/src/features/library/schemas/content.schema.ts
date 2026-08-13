import { z } from "zod";

export const updateContentSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(160, "Keep the title under 160 characters"),
  content: z
    .string()
    .trim()
    .min(1, "Content cannot be empty")
    .max(50_000, "Content is limited to 50,000 characters"),
  collection: z
    .string()
    .trim()
    .max(60, "Keep the collection name under 60 characters"),
}).strict();

export type UpdateContentInput = z.infer<typeof updateContentSchema>;
