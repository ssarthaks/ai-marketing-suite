import type { Metadata } from "next";
import { headers } from "next/headers";

import { LoginForm } from "@/features/auth/components/login-form";
import { canUseDevelopmentAuthBypass } from "@/server/auth/dev-bypass-policy";

export const metadata: Metadata = {
  title: "Log in",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ manual?: string | string[] }>;
}) {
  const [{ manual }, requestHeaders] = await Promise.all([
    searchParams,
    headers(),
  ]);
  const host = requestHeaders.get("host");
  const manualLogin = Array.isArray(manual)
    ? manual.includes("1")
    : manual === "1";
  const developmentBypassEnabled =
    !manualLogin &&
    Boolean(host && canUseDevelopmentAuthBypass(`http://${host}/login`));

  return (
    <LoginForm developmentBypassEnabled={developmentBypassEnabled} />
  );
}
