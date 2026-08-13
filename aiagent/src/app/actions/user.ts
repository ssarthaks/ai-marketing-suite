"use server";

import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import nodemailer from "secure-nodemailer";
import { after } from "next/server";
import { requireActiveUser, requireRole } from "@/lib/authz";
import { pool, query } from "@/lib/db";
import { syncPasswordToMarketing } from "@/lib/marketing-db";
import { rateLimit } from "@/lib/rate-limit";
import {
  getApplicationOrigin,
  getServerActionClientAddress,
  hashResetToken,
} from "@/lib/server-security";
import {
  emailSchema,
  parsePassword,
  roleSchema,
  uuidSchema,
} from "@/lib/validation";

const GENERIC_RESET_RESPONSE = { success: true } as const;

function createTemporaryPassword(): string {
  return `${crypto.randomBytes(24).toString("base64url")}!aA1`;
}

async function createAndSendPasswordReset(
  userId: string,
  email: string,
): Promise<boolean> {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashResetToken(token);
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const lockedUser = await client.query(
      "SELECT 1 FROM users WHERE id = $1 AND deleted_at IS NULL FOR UPDATE",
      [userId],
    );
    if (lockedUser.rowCount !== 1) {
      throw new Error("User is not active");
    }
    await client.query("DELETE FROM password_resets WHERE user_id = $1", [
      userId,
    ]);
    await client.query(
      "INSERT INTO password_resets (user_id, token, expires_at) VALUES ($1, $2, $3)",
      [userId, tokenHash, expiresAt],
    );
    await client.query("COMMIT");
  } catch {
    await client.query("ROLLBACK");
    throw new Error("Unable to create password reset");
  } finally {
    client.release();
  }

  if (
    !process.env.SMTP_HOST ||
    !process.env.SMTP_USER ||
    !process.env.SMTP_PASS
  ) {
    await query("DELETE FROM password_resets WHERE token = $1", [tokenHash]);
    console.error("Password reset email is not configured");
    return false;
  }

  try {
    // Keep the bearer token in the URL fragment so it is never sent in HTTP
    // request lines, reverse-proxy logs, analytics, or Referer headers.
    const resetLink = `${getApplicationOrigin()}/reset-password#token=${token}`;
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
      from: process.env.SMTP_FROM || "Lumen App <noreply@lumen.com>",
      from: process.env.SMTP_FROM || "AiAgent App <noreply@example.com>",
      to: email,
      subject: "Reset your password",
      text: `Reset your password using this one-time link (valid for 30 minutes): ${resetLink}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p style="color: #555; line-height: 1.5;">Use the button below to choose a new password.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #6FB941; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Reset Password</a>
          </div>
          <p style="color: #777; font-size: 14px;">If you did not request this, ignore this email. The one-time link expires in 30 minutes.</p>
        </div>
      `,
      disableFileAccess: true,
      disableUrlAccess: true,
    });
    return true;
  } catch {
    await query("DELETE FROM password_resets WHERE token = $1", [tokenHash]);
    console.error("Password reset email delivery failed");
    return false;
  }
}

export async function setupPassword(password: string) {
  const user = await requireActiveUser({ allowPasswordSetup: true });
  if (!user.forcePasswordChange) {
    throw new Error("Current password is required");
  }

  const validatedPassword = parsePassword(password);
  const hash = await bcrypt.hash(validatedPassword, 12);
  const result = await query(
    `UPDATE users
     SET password_hash = $1, force_password_change = FALSE
     WHERE id = $2 AND force_password_change = TRUE`,
    [hash, user.id],
  );
  if (result.rowCount !== 1) {
    throw new Error("Password setup is no longer available");
  }
  await syncPasswordToMarketing(user.email, hash);

  return { success: true, reauthenticate: true };
}

export async function updatePassword(oldPassword: string, newPassword: string) {
  const user = await requireActiveUser();
  const validatedPassword = parsePassword(newPassword);
  const limit = await rateLimit(`password-change:${user.id}`, 5, 15 * 60_000);
  if (!limit.success) {
    throw new Error("Too many password attempts. Try again later.");
  }

  const result = await query(
    "SELECT password_hash FROM users WHERE id = $1 AND deleted_at IS NULL",
    [user.id],
  );
  const passwordHash = result.rows[0]?.password_hash;
  if (!passwordHash || !(await bcrypt.compare(oldPassword, passwordHash))) {
    throw new Error("Incorrect current password");
  }
  if (await bcrypt.compare(validatedPassword, passwordHash)) {
    throw new Error("New password must be different");
  }

  const hash = await bcrypt.hash(validatedPassword, 12);
  await query("UPDATE users SET password_hash = $1 WHERE id = $2", [
    hash,
    user.id,
  ]);
  await syncPasswordToMarketing(user.email, hash);

  return { success: true, reauthenticate: true };
}

export async function getUsers() {
  await requireRole(["admin"]);
  const result = await query(
    "SELECT id, email, role, force_password_change, created_at, total_input_tokens, total_output_tokens, total_cost, pro_model_access, pro_model_requested FROM users WHERE deleted_at IS NULL ORDER BY created_at DESC",
  );
  return result.rows;
}

export async function getDeletedUsers() {
  await requireRole(["admin"]);
  const result = await query(
    "SELECT id, email, role, force_password_change, created_at, deleted_at FROM users WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC",
  );
  return result.rows;
}

export async function createUser(email: string, role: string) {
  await requireRole(["admin"]);
  const validatedEmail = emailSchema.parse(email);
  const validatedRole = roleSchema.parse(role);

  const existingResult = await query(
    "SELECT id, deleted_at FROM users WHERE email = $1",
    [validatedEmail],
  );
  const existingUser = existingResult.rows[0];
  if (existingUser) {
    if (existingUser.deleted_at !== null) {
      return { error: "user_deleted" as const, userId: existingUser.id };
    }
    throw new Error("Email already exists");
  }

  const passwordHash = await bcrypt.hash(createTemporaryPassword(), 12);
  const id = crypto.randomUUID();
  try {
    await query(
      "INSERT INTO users (id, email, password_hash, role, force_password_change) VALUES ($1, $2, $3, $4, TRUE)",
      [id, validatedEmail, passwordHash, validatedRole],
    );
    const passwordSetupEmailSent = await createAndSendPasswordReset(
      id,
      validatedEmail,
    );
    return { success: true, passwordSetupEmailSent };
  } catch {
    throw new Error("Failed to create user");
  }
}

export async function deleteUser(id: string) {
  const admin = await requireRole(["admin"]);
  const userId = uuidSchema.parse(id);
  if (admin.id === userId) {
    throw new Error("Cannot delete yourself");
  }

  const result = await query(
    "UPDATE users SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL",
    [userId],
  );
  if (result.rowCount !== 1) {
    throw new Error("User not found");
  }
  return { success: true };
}

export async function restoreUser(id: string) {
  await requireRole(["admin"]);
  const userId = uuidSchema.parse(id);
  const passwordHash = await bcrypt.hash(createTemporaryPassword(), 12);
  const result = await query(
    `UPDATE users
     SET deleted_at = NULL, password_hash = $1, force_password_change = TRUE,
         pro_model_access = FALSE, pro_model_requested = FALSE
     WHERE id = $2 AND deleted_at IS NOT NULL
     RETURNING email`,
    [passwordHash, userId],
  );
  if (result.rowCount !== 1) {
    throw new Error("User not found");
  }
  const passwordSetupEmailSent = await createAndSendPasswordReset(
    userId,
    result.rows[0].email,
  );
  return { success: true, passwordSetupEmailSent };
}

export async function updateUser(id: string, email: string, role: string) {
  const admin = await requireRole(["admin"]);
  const userId = uuidSchema.parse(id);
  const validatedEmail = emailSchema.parse(email);
  const validatedRole = roleSchema.parse(role);

  if (admin.id === userId && validatedRole !== "admin") {
    throw new Error("Cannot downgrade your own admin role");
  }

  const existing = await query(
    "SELECT id FROM users WHERE email = $1 AND id != $2",
    [validatedEmail, userId],
  );
  if (existing.rows.length > 0) {
    throw new Error("Email already in use by another user");
  }

  const result = await query(
    "UPDATE users SET email = $1, role = $2 WHERE id = $3 AND deleted_at IS NULL",
    [validatedEmail, validatedRole, userId],
  );
  if (result.rowCount !== 1) {
    throw new Error("User not found");
  }
  return { success: true };
}

export async function requestPasswordReset(email: string) {
  const parsedEmail = emailSchema.safeParse(email);
  const clientAddress = await getServerActionClientAddress();
  const accountKey = `password-reset:account:${parsedEmail.success ? parsedEmail.data : "invalid"}`;
  const [globalLimit, sourceLimit, accountLimit] = await Promise.all([
    rateLimit("password-reset:global", 200, 15 * 60_000),
    rateLimit(`password-reset:source:${clientAddress}`, 10, 15 * 60_000),
    rateLimit(accountKey, 3, 15 * 60_000),
  ]);
  if (
    !parsedEmail.success ||
    !globalLimit.success ||
    !sourceLimit.success ||
    !accountLimit.success
  ) {
    return GENERIC_RESET_RESPONSE;
  }

  const result = await query(
    "SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL",
    [parsedEmail.data],
  );
  if (result.rows[0]) {
    const userId = result.rows[0].id;
    const normalizedEmail = parsedEmail.data;
    after(async () => {
      try {
        await createAndSendPasswordReset(userId, normalizedEmail);
      } catch {
        console.error("Password reset processing failed");
      }
    });
  }
  return GENERIC_RESET_RESPONSE;
}

export async function resetPassword(token: string, newPassword: string) {
  const clientAddress = await getServerActionClientAddress();
  const limit = await rateLimit(
    `password-reset-consume:${clientAddress}`,
    10,
    15 * 60_000,
  );
  if (!limit.success || !/^[a-f0-9]{64}$/i.test(token)) {
    throw new Error("Invalid or expired reset token.");
  }

  const validatedPassword = parsePassword(newPassword);
  const tokenHash = hashResetToken(token.toLowerCase());
  const hash = await bcrypt.hash(validatedPassword, 12);
  const client = await pool.connect();
  let email: string | undefined;

  try {
    await client.query("BEGIN");
    const consumed = await client.query(
      `DELETE FROM password_resets
       WHERE token = $1 AND expires_at > NOW()
       RETURNING user_id`,
      [tokenHash],
    );
    const userId = consumed.rows[0]?.user_id;
    if (!userId) {
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
      throw new Error("Invalid or expired reset token.");
    }

    await client.query("DELETE FROM password_resets WHERE user_id = $1", [
      userId,
    ]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    if (
      error instanceof Error &&
      error.message === "Invalid or expired reset token."
    ) {
      throw error;
    }
    throw new Error("Unable to reset password");
  } finally {
    client.release();
  }

  await syncPasswordToMarketing(email, hash);
  return { success: true };
}

export async function getUserUsage() {
  const user = await requireActiveUser();
  const result = await query(
    "SELECT total_input_tokens, total_output_tokens, total_cost FROM users WHERE id = $1",
    [user.id],
  );
  const row = result.rows[0];
  return {
    total_input_tokens: Number(row?.total_input_tokens || 0),
    total_output_tokens: Number(row?.total_output_tokens || 0),
    total_cost: Number(row?.total_cost || 0),
  };
}

export async function getAggregateUsage() {
  await requireRole(["admin"]);
  const result = await query(
    "SELECT SUM(total_input_tokens) AS sum_input, SUM(total_output_tokens) AS sum_output, SUM(total_cost) AS sum_cost FROM users WHERE deleted_at IS NULL",
  );
  const row = result.rows[0];
  return {
    sum_input: Number(row?.sum_input || 0),
    sum_output: Number(row?.sum_output || 0),
    sum_cost: Number(row?.sum_cost || 0),
  };
}

export async function requestProModelAccess() {
  const user = await requireActiveUser();
  await query(
    "UPDATE users SET pro_model_requested = TRUE WHERE id = $1 AND pro_model_access = FALSE",
    [user.id],
  );
  return { success: true };
}

export async function toggleProModelAccess(userId: string, access: boolean) {
  await requireRole(["admin"]);
  const id = uuidSchema.parse(userId);
  if (typeof access !== "boolean") {
    throw new Error("Invalid access value");
  }
  const result = await query(
    "UPDATE users SET pro_model_access = $1, pro_model_requested = FALSE WHERE id = $2 AND deleted_at IS NULL",
    [access, id],
  );
  if (result.rowCount !== 1) {
    throw new Error("User not found");
  }
  return { success: true };
}

export async function checkProAccess() {
  const user = await requireActiveUser();
  return user.role === "admin" || user.proModelAccess;
}
