"use client";

import { useTransition } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  completeOnboardingAction,
  skipOnboardingAction,
} from "@/features/settings/actions/settings.actions";
import {
  brandProfileSchema,
  type BrandProfileInput,
} from "@/features/settings/schemas/settings.schema";
import { BrandProfileFields } from "./brand-profile-fields";

export function OnboardingForm({ userName }: { userName: string }) {
  const [isPending, startTransition] = useTransition();
  const firstName = userName.split(" ")[0] || "there";

  const form = useForm<BrandProfileInput>({
    resolver: zodResolver(brandProfileSchema),
    defaultValues: {
      brandName: "",
      website: "",
      industry: "",
      brandDescription: "",
      brandVoice: "",
      defaultTone: "professional",
    },
  });

  function onSubmit(values: BrandProfileInput) {
    startTransition(async () => {
      const result = await completeOnboardingAction(values);
      if (result && !result.ok) {
        toast.error(result.error);
      }
    });
  }

  function onSkip() {
    startTransition(async () => {
      await skipOnboardingAction();
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="w-full max-w-xl"
    >
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <BrandMark className="size-10" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome, {firstName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tell us about your brand so the AI writes like you from day one.
          </p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Brand profile</CardTitle>
          <CardDescription>
            Everything is optional — you can change it anytime in Settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BrandProfileFields form={form} onSubmit={onSubmit}>
            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
              <Button
                type="button"
                variant="ghost"
                disabled={isPending}
                onClick={onSkip}
                className="w-full sm:w-auto"
              >
                Skip for now
              </Button>
              <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
                {isPending && <Loader2 className="size-4 animate-spin" />}
                Continue to dashboard
              </Button>
            </div>
          </BrandProfileFields>
        </CardContent>
      </Card>
    </motion.div>
  );
}
