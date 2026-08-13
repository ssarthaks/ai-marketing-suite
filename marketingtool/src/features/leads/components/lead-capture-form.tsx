"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { capturePublicLeadAction } from "@/features/leads/actions/lead.actions";

interface LeadCaptureFormProps {
  landingPageId?: string;
  leadMagnetId?: string;
  buttonLabel?: string;
  withName?: boolean;
  /** Editor previews render the form disabled. */
  interactive?: boolean;
}

export function LeadCaptureForm({
  landingPageId,
  leadMagnetId,
  buttonLabel = "Notify me",
  withName = false,
  interactive = true,
}: LeadCaptureFormProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isPending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!interactive) return;
    setError(null);
    startTransition(async () => {
      const result = await capturePublicLeadAction({
        email,
        name: name || undefined,
        landingPageId,
        leadMagnetId,
      });
      if (result.ok) {
        setSubmitted(true);
      } else {
        setError(result.error);
      }
    });
  }

  if (submitted) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-lg border bg-muted/40 px-6 py-4 text-sm font-medium">
        <CheckCircle2 className="size-4 text-emerald-500" />
        You&apos;re on the list — check your inbox soon.
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mx-auto flex w-full max-w-md flex-col gap-3"
    >
      {withName && (
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Your name"
          autoComplete="name"
          disabled={!interactive || isPending}
        />
      )}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@company.com"
          autoComplete="email"
          disabled={!interactive || isPending}
          className="flex-1"
        />
        <Button type="submit" disabled={!interactive || isPending}>
          {isPending && <Loader2 className="size-4 animate-spin" />}
          {buttonLabel}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  );
}
