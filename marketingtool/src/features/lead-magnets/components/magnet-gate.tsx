"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Download, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { capturePublicLeadAction } from "@/features/leads/actions/lead.actions";
import {
  unlockLeadMagnetAction,
  type UnlockedMagnetContent,
} from "@/features/lead-magnets/actions/public.actions";

export function MagnetGate({ leadMagnetId }: { leadMagnetId: string }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState<UnlockedMagnetContent | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const captured = await capturePublicLeadAction({
        email,
        name: name || undefined,
        leadMagnetId,
      });
      if (!captured.ok) {
        setError(captured.error);
        return;
      }
      const content = await unlockLeadMagnetAction({ leadMagnetId, email });
      if (content.ok) {
        setUnlocked(content.data);
      } else {
        setError(content.error);
      }
    });
  }

  if (unlocked) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="size-4" />
          Unlocked — it&apos;s all yours
        </div>
        {unlocked.body && (
          <div className="rounded-xl border bg-muted/30 p-6 text-left">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
              {unlocked.body}
            </pre>
          </div>
        )}
        {unlocked.assetUrl && (
          <Button asChild className="w-full sm:w-auto">
            <a
              href={unlocked.assetUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Download className="size-4" />
              Download {unlocked.assetName ?? "file"}
            </a>
          </Button>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-md space-y-3">
      <Input
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Your name"
        autoComplete="name"
        disabled={isPending}
      />
      <Input
        type="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="you@company.com"
        autoComplete="email"
        disabled={isPending}
      />
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending && <Loader2 className="size-4 animate-spin" />}
        Get instant access
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <p className="text-xs text-muted-foreground">
        No spam — just the goods, straight to your screen.
      </p>
    </form>
  );
}
