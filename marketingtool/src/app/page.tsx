import { redirect } from "next/navigation";

import { resolveWorkspace } from "@/server/auth/session";

export default async function HomePage() {
  const scope = await resolveWorkspace();
  if (scope) {
    redirect("/dashboard");
  } else {
    redirect("/login");
  }
}
