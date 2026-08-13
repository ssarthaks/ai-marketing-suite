"use server";

import { isRedirectError } from "next/dist/client/components/redirect-error";
import { AuthError } from "next-auth";
import { headers } from "next/headers";

import { signIn, signOut } from "@/server/auth";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import {
  loginSchema,
  type LoginInput,
} from "@/features/auth/schemas/auth.schema";
import { rateLimit } from "@/lib/rate-limit";
import {
  clientAddress,
  opaqueRateLimitKey,
} from "@/lib/request-security";
import {
  canUseDevelopmentAuthBypass,
  getDevelopmentAuthBypassEmail,
} from "@/server/auth/dev-bypass-policy";

// Self-signup is disabled: accounts are created by the AI Agent admin and
// provisioned here automatically on first login or SSO redirect.

export async function loginAction(
  input: LoginInput
): Promise<ActionResult<void>> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Invalid input", parsed.error.flatten().fieldErrors);
  }

  const address = await clientAddress();
  const [combinedLimit, accountLimit, addressLimit] = await Promise.all([
    rateLimit(
      opaqueRateLimitKey("login", address, parsed.data.email),
      8,
      15 * 60_000,
    ),
    rateLimit(
      opaqueRateLimitKey("login-account", parsed.data.email),
      12,
      15 * 60_000,
    ),
    rateLimit(
      opaqueRateLimitKey("login-address", address),
      60,
      15 * 60_000,
    ),
  ]);
  if (
    !combinedLimit.success ||
    !accountLimit.success ||
    !addressLimit.success
  ) {
    return fail("Too many login attempts. Please try again later.");
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (isRedirectError(error)) throw error;
    if (error instanceof AuthError && error.type === "CredentialsSignin") {
      return fail("Invalid email or password");
    }
    return fail("Something went wrong. Please try again.");
  }

  return ok(undefined);
}

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: "/login?manual=1" });
}

export async function developmentLoginAction(): Promise<ActionResult<void>> {
  const developmentEmail = getDevelopmentAuthBypassEmail();
  if (!developmentEmail) {
    return fail("Development login bypass is not configured.");
  }

  const requestHeaders = await headers();
  const host = requestHeaders.get("host");
  if (
    !host ||
    !canUseDevelopmentAuthBypass(`http://${host}/login`)
  ) {
    return fail("Development login bypass is available only on localhost.");
  }

  try {
    await signIn("credentials", {
      devBypass: "true",
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (isRedirectError(error)) throw error;
    if (error instanceof AuthError && error.type === "CredentialsSignin") {
      return fail("The configured development identity is unavailable.");
    }
    return fail("Could not start the development session.");
  }

  return ok(undefined);
}
