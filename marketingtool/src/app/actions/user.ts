"use server";

import bcrypt from "bcryptjs";
import crypto from "crypto";
import nodemailer from "secure-nodemailer";
import { after } from "next/server";
import { z } from "zod";

import { db } from "@/server/db";
import { pool, query } from "@/lib/db";
import {
  requireActiveIdentity,
  requireAdminIdentity,
} from "@/server/auth/authorization";
import {
  emailAddressSchema,
  sha256Token,
  strongPasswordSchema,
} from "@/lib/password-security";
import { rateLimit } from "@/lib/rate-limit";
import { clientAddress, opaqueRateLimitKey } from "@/lib/request-security";

const userIdSchema = z.string().trim().min(1).max(128);
const userRoleSchema = z.enum(["admin", "team_lead", "user"]);

/** Best-effort: keep the local Prisma password hash in step with AiAgent. */
async function syncHashToPrisma(email: string | undefined, hash: string) {
  if (!email) return;
  try {
    await db.user.updateMany({
      where: { email: { equals: email, mode: "insensitive" } },
      data: { passwordHash: hash },
    });
  } catch (error) {
    console.error(
      "Failed to sync password hash to marketing DB:",
      error instanceof Error ? error.name : "Unknown error",
    );
  }
}

async function enforceUserActionLimit(
  action: string,
  identity: string,
  limit: number,
  windowMs: number,
) {
  const address = await clientAddress();
  const [combined, identityOnly] = await Promise.all([
    rateLimit(opaqueRateLimitKey(action, address, identity), limit, windowMs),
    rateLimit(
      opaqueRateLimitKey(`${action}-identity`, identity),
      limit * 2,
      windowMs,
    ),
  ]);
  if (!combined.success || !identityOnly.success) {
    throw new Error("Too many attempts. Please try again later.");
  }
}

async function createAndSendPasswordReset(email: string): Promise<boolean> {
  const aiAgentAppUrl = process.env.AIAGENT_APP_URL;
  if (
    !aiAgentAppUrl ||
    !process.env.SMTP_HOST ||
    !process.env.SMTP_USER ||
    !process.env.SMTP_PASS
  ) {
    return false;
  }

  let appUrl: URL;
  try {
    appUrl = new URL(aiAgentAppUrl);
    const isLocalDevelopment =
      process.env.NODE_ENV !== "production" &&
      appUrl.protocol === "http:" &&
      ["localhost", "127.0.0.1", "::1"].includes(appUrl.hostname);
    if (
      appUrl.username ||
      appUrl.password ||
      appUrl.pathname !== "/" ||
      appUrl.search ||
      appUrl.hash ||
      (appUrl.protocol !== "https:" && !isLocalDevelopment)
    ) {
      return false;
    }
  } catch {
    return false;
  }

  const res = await query(
    `SELECT id, email
     FROM users
     WHERE LOWER(email) = LOWER($1) AND deleted_at IS NULL`,
    [email],
  );
  const user = res.rows[0];
  if (!user) return false;

  const token = crypto.randomBytes(32).toString("hex");
  const digest = sha256Token(token.toLowerCase());
  const expiresAt = new Date(Date.now() + 30 * 60_000);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const locked = await client.query(
      "SELECT 1 FROM users WHERE id = $1 AND deleted_at IS NULL FOR UPDATE",
      [user.id],
    );
    if (locked.rowCount !== 1) throw new Error("Identity is not active");
    await client.query("DELETE FROM password_resets WHERE user_id = $1", [
      user.id,
    ]);
    await client.query(
      "INSERT INTO password_resets (user_id, token, expires_at) VALUES ($1, $2, $3)",
      [user.id, digest, expiresAt],
    );
    await client.query("COMMIT");
  } catch {
    await client.query("ROLLBACK").catch(() => undefined);
    return false;
  } finally {
    client.release();
  }

  // A fragment is not sent in HTTP request lines, reverse-proxy logs,
  // analytics, or Referer headers.
  const resetLink = new URL("/reset-password", appUrl);
  resetLink.hash = `token=${token}`;

  try {
    const smtpPort = Number(process.env.SMTP_PORT) || 587;
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: smtpPort,
      secure: smtpPort === 465,
      requireTLS: smtpPort !== 465,
      disableFileAccess: true,
      disableUrlAccess: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        minVersion: "TLSv1.2",
        rejectUnauthorized: true,
      },
    });
    await transporter.sendMail({
      from: process.env.SMTP_FROM || "AiAgent <noreply@example.com>",
      to: user.email,
      subject: "Reset your password",
      text: `Reset your password using this one-time link (valid for 30 minutes): ${resetLink.toString()}`,
      html: `<p>Reset your password using this one-time link (valid for 30 minutes):</p><p><a href="${resetLink.toString()}">Reset password</a></p>`,
      disableFileAccess: true,
      disableUrlAccess: true,
    });
    return true;
  } catch {
    await query("DELETE FROM password_resets WHERE token = $1", [digest]).catch(
      () => undefined,
    );
    console.error("Failed to send password reset email");
    return false;
  }
}

export async function setupPassword(password: string) {
  const identity = await requireActiveIdentity({ allowPasswordSetup: true });
  const parsed = strongPasswordSchema.safeParse(password);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);
  await enforceUserActionLimit("setup-password", identity.id, 5, 15 * 60_000);

  const hash = await bcrypt.hash(parsed.data, 12);
  const result = await query(
    `UPDATE users
     SET password_hash = $1, force_password_change = FALSE
     WHERE id = $2 AND force_password_change = TRUE`,
    [hash, identity.id],
  );
  if (result.rowCount !== 1) {
    throw new Error("Current password is required to change this password");
  }

  await syncHashToPrisma(identity.email, hash);
  return { success: true };
}

export async function updatePassword(oldPassword: string, newPassword: string) {
  const identity = await requireActiveIdentity();
  const parsed = strongPasswordSchema.safeParse(newPassword);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);
  if (!oldPassword || oldPassword.length > 128) {
    throw new Error("Incorrect current password");
  }
  if (oldPassword === parsed.data) {
    throw new Error("New password must be different");
  }
  await enforceUserActionLimit("update-password", identity.id, 8, 15 * 60_000);

  const res = await query(
    "SELECT password_hash FROM users WHERE id = $1 AND deleted_at IS NULL",
    [identity.id],
  );
  const user = res.rows[0];
  if (!user?.password_hash) throw new Error("Unauthorized");

  const isValid = await bcrypt.compare(oldPassword, user.password_hash);
  if (!isValid) throw new Error("Incorrect current password");

  const hash = await bcrypt.hash(parsed.data, 12);
  await query("UPDATE users SET password_hash = $1 WHERE id = $2", [
    hash,
    identity.id,
  ]);
  await syncHashToPrisma(identity.email, hash);

  return { success: true };
}

export async function getUsers() {
  await requireAdminIdentity();
  const res = await query(
    `SELECT id, email, role, force_password_change, created_at,
            total_input_tokens, total_output_tokens, total_cost,
            pro_model_access, pro_model_requested
     FROM users
     WHERE deleted_at IS NULL
     ORDER BY created_at DESC`,
  );
  return res.rows;
}

export async function getDeletedUsers() {
  await requireAdminIdentity();
  const res = await query(
    `SELECT id, email, role, force_password_change, created_at, deleted_at
     FROM users
     WHERE deleted_at IS NOT NULL
     ORDER BY deleted_at DESC`,
  );
  return res.rows;
}

export async function createUser(email: string, role: string) {
  await requireAdminIdentity();
  const parsedEmail = emailAddressSchema.safeParse(email);
  const parsedRole = userRoleSchema.safeParse(role);
  if (!parsedEmail.success || !parsedRole.success) {
    throw new Error("Invalid user details");
  }

  const existingRes = await query(
    "SELECT id, deleted_at FROM users WHERE LOWER(email) = LOWER($1)",
    [parsedEmail.data],
  );
  const existingUser = existingRes.rows[0];
  if (existingUser) {
    if (existingUser.deleted_at !== null) {
      return { error: "user_deleted", userId: existingUser.id };
    }
    throw new Error("Email already exists");
  }

  // Every new account gets an unpredictable one-time credential and must
  // replace it before either application grants access.
  const temporaryPassword = `${crypto.randomBytes(18).toString("base64url")}!Aa1`;
  const passwordHash = await bcrypt.hash(temporaryPassword, 12);
  const id = crypto.randomUUID();

  try {
    await query(
      `INSERT INTO users
         (id, email, password_hash, role, force_password_change)
       VALUES ($1, $2, $3, $4, TRUE)`,
      [id, parsedEmail.data, passwordHash, parsedRole.data],
    );
    const passwordSetupEmailSent = await createAndSendPasswordReset(
      parsedEmail.data,
    );
    return { success: true, passwordSetupEmailSent };
  } catch {
    throw new Error("Failed to create user");
  }
}

async function ensureAdminWillRemain(targetId: string) {
  const target = await query(
    "SELECT role FROM users WHERE id = $1 AND deleted_at IS NULL",
    [targetId],
  );
  if (target.rows[0]?.role !== "admin") return;

  const admins = await query(
    "SELECT COUNT(*)::int AS count FROM users WHERE role = 'admin' AND deleted_at IS NULL",
  );
  if (Number(admins.rows[0]?.count ?? 0) <= 1) {
    throw new Error("Cannot remove the last active administrator");
  }
}

export async function deleteUser(id: string) {
  const admin = await requireAdminIdentity();
  const targetId = userIdSchema.parse(id);
  if (admin.id === targetId) throw new Error("Cannot delete yourself");

  await ensureAdminWillRemain(targetId);
  await query(
    "UPDATE users SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL",
    [targetId],
  );
  return { success: true };
}

export async function restoreUser(id: string) {
  await requireAdminIdentity();
  const targetId = userIdSchema.parse(id);
  const passwordHash = await bcrypt.hash(
    `${crypto.randomBytes(24).toString("base64url")}!Aa1`,
    12,
  );
  const restored = await query(
    `UPDATE users
     SET deleted_at = NULL, password_hash = $1, force_password_change = TRUE,
         pro_model_access = FALSE, pro_model_requested = FALSE
     WHERE id = $2 AND deleted_at IS NOT NULL
     RETURNING email`,
    [passwordHash, targetId],
  );
  if (restored.rowCount !== 1) throw new Error("User not found");
  const passwordSetupEmailSent = await createAndSendPasswordReset(
    restored.rows[0].email,
  );
  return { success: true, passwordSetupEmailSent };
}

export async function updateUser(id: string, email: string, role: string) {
  const admin = await requireAdminIdentity();
  const targetId = userIdSchema.parse(id);
  const parsedEmail = emailAddressSchema.safeParse(email);
  const parsedRole = userRoleSchema.safeParse(role);
  if (!parsedEmail.success || !parsedRole.success) {
    throw new Error("Invalid user details");
  }
  if (admin.id === targetId && parsedRole.data !== "admin") {
    throw new Error("Cannot downgrade your own admin role");
  }

  if (parsedRole.data !== "admin") await ensureAdminWillRemain(targetId);

  const existing = await query(
    "SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND id != $2",
    [parsedEmail.data, targetId],
  );
  if (existing.rows.length > 0) {
    throw new Error("Email already in use by another user");
  }

  await query("UPDATE users SET email = $1, role = $2 WHERE id = $3", [
    parsedEmail.data,
    parsedRole.data,
    targetId,
  ]);
  return { success: true };
}

/**
 * Password recovery is owned by the shared identity service. This compatible
 * implementation stores only a SHA-256 digest, never returns/logs the bearer
 * token, and only issues mail when the identity app URL and SMTP are present.
 */
export async function requestPasswordReset(email: string) {
  const parsed = emailAddressSchema.safeParse(email);
  const normalized = parsed.success ? parsed.data : "invalid";
  try {
    await enforceUserActionLimit(
      "password-reset-request",
      normalized,
      3,
      60 * 60_000,
    );
  } catch {
    return { success: true };
  }
  if (parsed.success) {
    const normalizedEmail = parsed.data;
    after(async () => {
      try {
        await createAndSendPasswordReset(normalizedEmail);
      } catch {
        console.error("Password reset processing failed");
      }
    });
  }

  return { success: true };
}

export async function resetPassword(token: string, newPassword: string) {
  const parsedPassword = strongPasswordSchema.safeParse(newPassword);
  if (
    !parsedPassword.success ||
    !/^[a-f0-9]{64}$/i.test(token) ||
    token.length !== 64
  ) {
    throw new Error("Invalid or expired reset token.");
  }
  await enforceUserActionLimit(
    "password-reset",
    token.slice(0, 16).toLowerCase(),
    8,
    15 * 60_000,
  );

  const digest = sha256Token(token.toLowerCase());
  const hash = await bcrypt.hash(parsedPassword.data, 12);
  const client = await pool.connect();
  let email: string | undefined;
  try {
    await client.query("BEGIN");
    const consumed = await client.query(
      `DELETE FROM password_resets
       WHERE token = $1 AND expires_at > NOW()
       RETURNING user_id`,
      [digest],
    );
    const userId = consumed.rows[0]?.user_id;
    if (!userId) {
      await client.query("ROLLBACK");
      throw new Error("Invalid or expired reset token.");
    }

    const updated = await client.query(
      `UPDATE users
       SET password_hash = $1, force_password_change = FALSE
       WHERE id = $2 AND deleted_at IS NULL
       RETURNING email`,
      [hash, userId],
    );
    email = updated.rows[0]?.email;
    if (!email) {
      await client.query("ROLLBACK");
      throw new Error("Invalid or expired reset token.");
    }
    await client.query("COMMIT");
  } catch (error) {
    if (
      !(error instanceof Error) ||
      error.message !== "Invalid or expired reset token."
    ) {
      await client.query("ROLLBACK").catch(() => undefined);
    }
    throw error;
  } finally {
    client.release();
  }

  await syncHashToPrisma(email, hash);
  return { success: true };
}

export async function getUserUsage() {
  const identity = await requireActiveIdentity();
  const res = await query(
    "SELECT total_input_tokens, total_output_tokens, total_cost FROM users WHERE id = $1",
    [identity.id],
  );
  if (res.rows.length === 0) {
    return { total_input_tokens: 0, total_output_tokens: 0, total_cost: 0 };
  }
  return {
    total_input_tokens: Number(res.rows[0].total_input_tokens || 0),
    total_output_tokens: Number(res.rows[0].total_output_tokens || 0),
    total_cost: Number(res.rows[0].total_cost || 0),
  };
}

export async function getAggregateUsage() {
  await requireAdminIdentity();
  const res = await query(
    `SELECT SUM(total_input_tokens) AS sum_input,
            SUM(total_output_tokens) AS sum_output,
            SUM(total_cost) AS sum_cost
     FROM users
     WHERE deleted_at IS NULL`,
  );
  return {
    sum_input: Number(res.rows[0]?.sum_input || 0),
    sum_output: Number(res.rows[0]?.sum_output || 0),
    sum_cost: Number(res.rows[0]?.sum_cost || 0),
  };
}

export async function requestProModelAccess() {
  const identity = await requireActiveIdentity();
  await query(
    "UPDATE users SET pro_model_requested = TRUE WHERE id = $1 AND deleted_at IS NULL",
    [identity.id],
  );
  return { success: true };
}

export async function toggleProModelAccess(userId: string, access: boolean) {
  await requireAdminIdentity();
  const targetId = userIdSchema.parse(userId);
  if (typeof access !== "boolean") throw new Error("Invalid request");
  await query(
    `UPDATE users
     SET pro_model_access = $1, pro_model_requested = FALSE
     WHERE id = $2 AND deleted_at IS NULL`,
    [access, targetId],
  );
  return { success: true };
}

export async function checkProAccess() {
  try {
    const identity = await requireActiveIdentity();
    return identity.role === "admin" || identity.proModelAccess;
  } catch {
    return false;
  }
}
