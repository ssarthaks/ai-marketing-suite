import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { db } from "@/server/db";
import { requireWorkspace } from "@/server/auth/session";
import { OnboardingForm } from "@/features/settings/components/onboarding-form";

export const metadata: Metadata = {
  title: "Welcome",
};

export default async function OnboardingPage() {
  const { userId, name, workspaceId } = await requireWorkspace();

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { onboardedAt: true },
  });
  if (user?.onboardedAt) {
    redirect("/dashboard");
  }

  return (
    <div className="grid min-h-svh place-items-center bg-muted/40 px-4 py-12">
      <OnboardingForm userName={name} />
    </div>
  );
}
