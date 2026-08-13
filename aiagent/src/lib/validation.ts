import { z } from "zod";

export const USER_ROLES = ["user", "team_lead", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address")
  .max(254, "Email address is too long");

export const passwordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .max(128, "Password must be at most 128 characters")
  .regex(/[a-z]/, "Password must include a lowercase letter")
  .regex(/[A-Z]/, "Password must include an uppercase letter")
  .regex(/[0-9]/, "Password must include a number")
  .regex(/[^A-Za-z0-9]/, "Password must include a symbol");

export const roleSchema = z.enum(USER_ROLES);
export const uuidSchema = z.string().uuid("Invalid identifier");

export const identifierSchema = z
  .string()
  .min(1)
  .max(80)
  .regex(
    /^[A-Za-z0-9_-]+$/,
    "Only letters, numbers, dashes, and underscores are allowed",
  );

export function parsePassword(password: unknown): string {
  return passwordSchema.parse(password);
}
