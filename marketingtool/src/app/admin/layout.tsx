import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { requireAdminIdentity } from "@/server/auth/authorization";

export default async function AdminLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  try {
    await requireAdminIdentity();
  } catch {
    redirect("/dashboard");
  }

  return children;
}
