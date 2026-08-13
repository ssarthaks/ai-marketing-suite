import { z } from "zod";

const folderPattern = /^\/([a-z0-9-]+(\/[a-z0-9-]+)*)?$/;

export const assetFolderSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(120, "Folder path is too long")
  .refine(
    (value) => folderPattern.test(value),
    "Folders look like /brand or /brand/logos (lowercase letters, numbers, dashes)"
  );

export const saveAssetSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  folder: assetFolderSchema,
  campaignId: z.string().optional(),
  publicId: z.string().min(1).max(300),
  url: z.string().url(),
  mimeType: z.string().min(1).max(100),
  size: z.number().int().nonnegative().max(100 * 1024 * 1024),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  format: z.string().max(20).optional(),
  visibility: z.enum(["PUBLIC", "PRIVATE", "SHARED"]).default("PUBLIC").optional(),
  sharedWithUserIds: z.array(z.string().min(1).max(128)).max(100).optional(),
}).strict();

export type SaveAssetInput = z.infer<typeof saveAssetSchema>;
