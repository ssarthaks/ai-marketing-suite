import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import jwt, { type JwtPayload } from "jsonwebtoken";

import { db } from "@/server/db";
import { query } from "@/lib/db";
import { loginSchema } from "@/features/auth/schemas/auth.schema";
import { edgeAuthConfig } from "./edge-config";
import {
  ensureProjectMemberships,
  loginViaDevelopmentBypass,
  loginViaAiAgent,
  nameFromEmail,
} from "./user-sync";
import {
  canUseDevelopmentAuthBypass,
  getDevelopmentAuthBypassEmail,
} from "./dev-bypass-policy";
import { rateLimit } from "@/lib/rate-limit";
import { opaqueRateLimitKey } from "@/lib/request-security";
import {
  getCredentialVersion,
  isAllowedIdentityRole,
  safeCredentialVersionEqual,
} from "./credential-security";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

if (
  process.env.NODE_ENV === "production" &&
  process.env.NEXT_PHASE !== "phase-production-build"
) {
  const authSecret = process.env.AUTH_SECRET;
  const ssoSecret = process.env.SSO_SECRET;
  if (!authSecret || authSecret.length < 32) {
    throw new Error("AUTH_SECRET must contain at least 32 characters");
  }
  if (!ssoSecret || ssoSecret.length < 32 || ssoSecret === authSecret) {
    throw new Error(
      "SSO_SECRET must contain at least 32 characters and be distinct from AUTH_SECRET",
    );
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...edgeAuthConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        ssoToken: { label: "SSO Token", type: "text" },
        devBypass: { label: "Development bypass", type: "text" },
      },
      async authorize(credentials, request) {
        const forwarded = request.headers.get("x-forwarded-for");
        const address = (
          forwarded?.split(",")[0]?.trim() ||
          request.headers.get("x-real-ip") ||
          "unknown"
        ).slice(0, 128);
        const providerLimit = await rateLimit(
          opaqueRateLimitKey("credentials-provider", address),
          60,
          15 * 60_000,
        );
        if (!providerLimit.success) return null;

        if (credentials?.devBypass === "true") {
          const developmentEmail = getDevelopmentAuthBypassEmail();
          const requestHost = request.headers.get("host");
          if (
            !developmentEmail ||
            !requestHost ||
            !canUseDevelopmentAuthBypass(
              `http://${requestHost}/api/auth/callback/credentials`,
            )
          ) {
            return null;
          }
          const synced = await loginViaDevelopmentBypass(developmentEmail);
          if (!synced) return null;
          const { user, identity } = synced;
          return {
            id: user.id,
            sharedIdentityId: identity.id,
            name: user.name,
            email: user.email,
            image: user.image,
            role: identity.role,
            force_password_change: identity.forcePasswordChange,
            pro_model_access: identity.proModelAccess,
            pro_model_requested: identity.proModelRequested,
            credential_version: getCredentialVersion(identity.passwordHash),
          };
        }

        if (credentials?.ssoToken && typeof credentials.ssoToken === "string") {
          try {
            const secret = process.env.SSO_SECRET;
            if (
              !secret ||
              secret.length < 32 ||
              secret === process.env.AUTH_SECRET
            ) {
              return null;
            }
            const decoded = jwt.verify(credentials.ssoToken, secret, {
              algorithms: ["HS256"],
              issuer: "aiagent",
              audience: "marketingtool",
              clockTolerance: 10,
              maxAge: "2m",
            }) as JwtPayload & {
              id?: unknown;
              email?: unknown;
              purpose?: unknown;
            };
            if (
              typeof decoded.id !== "string" ||
              !UUID_PATTERN.test(decoded.id) ||
              typeof decoded.email !== "string" ||
              !decoded.email ||
              decoded.email.length > 254 ||
              decoded.purpose !== "cross-app-login" ||
              typeof decoded.jti !== "string" ||
              !UUID_PATTERN.test(decoded.jti) ||
              typeof decoded.iat !== "number" ||
              typeof decoded.exp !== "number" ||
              decoded.exp <= decoded.iat ||
              decoded.exp - decoded.iat > 120
            ) {
              return null;
            }

            const res = await query(
              `SELECT id, email, password_hash, role, force_password_change,
                      pro_model_access, pro_model_requested
               FROM users
               WHERE id = $1
                 AND LOWER(email) = LOWER($2)
                 AND deleted_at IS NULL
               LIMIT 1`,
              [decoded.id, decoded.email],
            );
            const sharedUser = res.rows[0];
            if (
              !sharedUser ||
              !sharedUser.password_hash ||
              sharedUser.force_password_change ||
              !isAllowedIdentityRole(sharedUser.role)
            ) {
              return null;
            }

            // A JTI may only establish one Marketing Tool session. Persisting
            // it makes replay protection work across serverless instances.
            await db.ssoTokenUse.create({
              data: {
                jti: decoded.jti,
                expiresAt: new Date(decoded.exp * 1000),
              },
            });
            void db.ssoTokenUse
              .deleteMany({ where: { expiresAt: { lt: new Date() } } })
              .catch(() => undefined);

            let user = await db.user.findFirst({
              where: {
                email: { equals: sharedUser.email, mode: "insensitive" },
              },
            });
            if (!user) {
              // The SSO token is signed by the trusted AI Agent app; provision
              // a local account from the shared AiAgent users table on first visit.
              user = await db.user.create({
                data: {
                  email: sharedUser.email,
                  name: nameFromEmail(sharedUser.email),
                  passwordHash: sharedUser.password_hash,
                  onboardedAt: new Date(),
                },
              });
            } else if (
              user.email !== sharedUser.email ||
              user.passwordHash !== sharedUser.password_hash
            ) {
              user = await db.user.update({
                where: { id: user.id },
                data: {
                  email: sharedUser.email,
                  passwordHash: sharedUser.password_hash,
                },
              });
            }
            await ensureProjectMemberships(user.id);

            return {
              id: user.id,
              sharedIdentityId: sharedUser.id,
              name: user.name,
              email: user.email,
              image: user.image,
              role: sharedUser.role,
              force_password_change: !!sharedUser.force_password_change,
              pro_model_access: !!sharedUser.pro_model_access,
              pro_model_requested: !!sharedUser.pro_model_requested,
              credential_version: getCredentialVersion(
                sharedUser.password_hash,
              ),
            };
          } catch (error) {
            console.error(
              "SSO token verification failed:",
              error instanceof Error ? error.name : "Unknown error",
            );
            return null;
          }
        }

        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const accountLimit = await rateLimit(
          opaqueRateLimitKey("credentials-account", email),
          12,
          15 * 60_000,
        );
        if (!accountLimit.success) return null;
        // The shared AI Agent users table is the single source of truth for
        // credentials and access. The Prisma user is only a local workspace
        // mapping and is provisioned/synchronized after shared auth succeeds.
        const synced = await loginViaAiAgent(email, password);
        if (!synced) return null;
        const { user, identity } = synced;
        if (identity.forcePasswordChange) return null;

        return {
          id: user.id,
          sharedIdentityId: identity.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: identity.role,
          force_password_change: identity.forcePasswordChange,
          pro_model_access: identity.proModelAccess,
          pro_model_requested: identity.proModelRequested,
          credential_version: getCredentialVersion(identity.passwordHash),
        };
      },
    }),
  ],
  callbacks: {
    ...edgeAuthConfig.callbacks,
    async jwt({ token, user, trigger, session }) {
      // On sign-in, resolve the user's default workspace once and cache it in the JWT.
      if (user?.id) {
        token.userId = user.id;
        token.sharedIdentityId = user.sharedIdentityId;
        token.role = user.role;
        token.force_password_change = user.force_password_change;
        token.pro_model_access = user.pro_model_access;
        token.pro_model_requested = user.pro_model_requested;
        token.credential_version = user.credential_version;
        const membership = await db.workspaceMember.findFirst({
          where: { userId: user.id },
          orderBy: { createdAt: "asc" },
          select: { workspaceId: true },
        });
        token.workspaceId = membership?.workspaceId;
      } else if (token.email) {
        const sharedIdentityId =
          typeof token.sharedIdentityId === "string" &&
          UUID_PATTERN.test(token.sharedIdentityId)
            ? token.sharedIdentityId
            : null;
        const shared = sharedIdentityId
          ? await query(
              `SELECT id, password_hash, role, force_password_change,
                      pro_model_access, pro_model_requested
               FROM users
               WHERE id = $1
                 AND LOWER(email) = LOWER($2)
                 AND deleted_at IS NULL
               LIMIT 1`,
              [sharedIdentityId, token.email],
            )
          : await query(
              `SELECT id, password_hash, role, force_password_change,
                      pro_model_access, pro_model_requested
               FROM users
               WHERE LOWER(email) = LOWER($1) AND deleted_at IS NULL
               LIMIT 2`,
              [token.email],
            );
        // Existing sessions without the new claim are upgraded only when the
        // email resolves to exactly one active shared identity.
        const identity =
          sharedIdentityId || shared.rows.length === 1
            ? shared.rows[0]
            : undefined;
        const currentCredentialVersion =
          identity?.password_hash &&
          getCredentialVersion(identity.password_hash);
        const credentialMatches =
          typeof token.credential_version === "string" &&
          typeof currentCredentialVersion === "string" &&
          safeCredentialVersionEqual(
            token.credential_version,
            currentCredentialVersion,
          );
        if (
          identity &&
          isAllowedIdentityRole(identity.role) &&
          credentialMatches
        ) {
          token.sharedIdentityId = identity.id;
          token.role = identity.role;
          token.force_password_change = !!identity.force_password_change;
          token.pro_model_access = !!identity.pro_model_access;
          token.pro_model_requested = !!identity.pro_model_requested;
        } else {
          // Prevent deleted accounts, unknown roles, and sessions established
          // with an older password credential from retaining access.
          token.sharedIdentityId = undefined;
          token.role = "disabled";
          token.force_password_change = false;
          token.pro_model_access = false;
          token.pro_model_requested = false;
        }
      }
      // Never copy client-provided session updates into authorization claims.
      // The shared users table refresh above is the only privilege source.
      return token;
    },
    async session({ session, token }) {
      if (token.userId) session.user.id = token.userId;
      session.user.sharedIdentityId =
        typeof token.sharedIdentityId === "string"
          ? token.sharedIdentityId
          : "";
      if (token.workspaceId) session.user.workspaceId = token.workspaceId;
      session.user.role = token.role ?? "user";
      session.user.force_password_change = token.force_password_change ?? false;
      session.user.pro_model_access = token.pro_model_access ?? false;
      session.user.pro_model_requested = token.pro_model_requested ?? false;
      session.user.credential_version =
        typeof token.credential_version === "string"
          ? token.credential_version
          : "";
      return session;
    },
  },
});
