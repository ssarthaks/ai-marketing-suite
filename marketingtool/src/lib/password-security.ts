import { createHash } from "crypto";
import { z } from "zod";

export const emailAddressSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email()
  .max(254);

export const strongPasswordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .max(128, "Password must be at most 128 characters")
  .refine(
    (value) =>
      /[a-z]/.test(value) &&
      /[A-Z]/.test(value) &&
      /\d/.test(value) &&
      /[^A-Za-z0-9]/.test(value),
    "Password must include uppercase, lowercase, number, and symbol",
  );

export function sha256Token(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}
