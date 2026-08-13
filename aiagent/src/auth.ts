import NextAuth, { DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { query } from "@/lib/db";
import { findMarketingUser } from "@/lib/marketing-db";
import { clearRateLimit, rateLimit } from "@/lib/rate-limit";
import {
  getApplicationOrigin,
  getClientAddress,
  getCredentialVersion,
} from "@/lib/server-security";
import { emailSchema, roleSchema } from "@/lib/validation";
import { authConfig } from "./auth.config";

const DUMMY_PASSWORD_HASH =
  "$2b$12$clq7pW53G4DeVX2bESJwYupNwRSMcwqleE0gO70ZqbrgKH00P/AYO";

async function verifyPassword(password: string, passwordHash: unknown) {
  if (typeof passwordHash !== "string") {
    await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
    return false;
  }
  try {
    return await bcrypt.compare(password, passwordHash);
  } catch {
    await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
    return false;
  }
}

if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) {
  throw new Error("AUTH_SECRET must contain at least 32 characters");
}
if (process.env.NODE_ENV === "production") {
  getApplicationOrigin();
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      force_password_change: boolean;
      pro_model_access: boolean;
      pro_model_requested: boolean;
      credential_version: string;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: string;
    force_password_change: boolean;
    pro_model_access: boolean;
    pro_model_requested: boolean;
    credential_version: string;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials, request) => {
        const parsedEmail = emailSchema.safeParse(credentials?.email);
        const password =
          typeof credentials?.password === "string" ? credentials.password : "";
        if (!parsedEmail.success || !password || password.length > 256) {
          await bcrypt.compare(password || "invalid", DUMMY_PASSWORD_HASH);
          throw new Error("Invalid credentials.");
        }

        const email = parsedEmail.data;
        const clientAddress = getClientAddress(request.headers);
        const accountLimitKey = `login:account:${email}`;
        const sourceLimitKey = `login:source:${clientAddress}`;
        const [accountLimit, sourceLimit] = await Promise.all([
          rateLimit(accountLimitKey, 5, 15 * 60 * 1000),
          rateLimit(sourceLimitKey, 50, 15 * 60 * 1000),
        ]);
        if (!accountLimit.success || !sourceLimit.success) {
          await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
          throw new Error("Invalid credentials.");
        }

        const res = await query(
          `SELECT id, email, password_hash, role, force_password_change,
                  pro_model_access, pro_model_requested
           FROM users
           WHERE email = $1 AND deleted_at IS NULL`,
          [email],
        );
        let user = res.rows[0];

        let isValid = await verifyPassword(password, user?.password_hash);
        if (!isValid) {
          // Always perform the secondary comparison, including for unknown
          // accounts, so wrong-password timing does not disclose membership.
          const marketingUser = await findMarketingUser(email);
          const marketingValid = await verifyPassword(
            password,
            marketingUser?.password_hash,
          );
          if (marketingValid && marketingUser?.password_hash) {
            if (!user) {
              // Accounts created in the Marketing Tool share the same
              // credentials; provision a least-privileged local row.
              await query(
                `INSERT INTO users (id, email, password_hash, role, force_password_change)
                 VALUES ($1, $2, $3, 'user', FALSE)
                 ON CONFLICT (email) DO NOTHING`,
                [crypto.randomUUID(), email, marketingUser.password_hash],
              );
              const created = await query(
                `SELECT id, email, password_hash, role, force_password_change,
                        pro_model_access, pro_model_requested
                 FROM users
                 WHERE email = $1 AND deleted_at IS NULL`,
                [email],
              );
              user = created.rows[0];
            } else {
              // The password may have changed in the Marketing Tool. Re-sync
              // only the credential hash; local authorization remains local.
              const updated = await query(
                `UPDATE users
                 SET password_hash = $1
                 WHERE id = $2 AND deleted_at IS NULL
                 RETURNING id, email, password_hash, role,
                           force_password_change, pro_model_access,
                           pro_model_requested`,
                [marketingUser.password_hash, user.id],
              );
              user = updated.rows[0];
            }
            isValid = !!user;
          }
        }

        const parsedRole = roleSchema.safeParse(user?.role);
        if (
          !isValid ||
          !user ||
          typeof user.password_hash !== "string" ||
          !parsedRole.success
        ) {
          throw new Error("Invalid credentials.");
        }

        clearRateLimit(accountLimitKey);

        return {
          id: user.id,
          email: user.email,
          role: parsedRole.data,
          force_password_change: !!user.force_password_change,
          pro_model_access: !!user.pro_model_access,
          pro_model_requested: !!user.pro_model_requested,
          credential_version: getCredentialVersion(user.password_hash),
        };
      },
    }),
  ],
});
