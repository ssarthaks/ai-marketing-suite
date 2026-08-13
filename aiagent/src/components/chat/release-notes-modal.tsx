"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, CheckCircle2, Download } from "lucide-react";
import { cn } from "@/lib/utils";

export function ReleaseNotesModal() {
  const [open, setOpen] = useState(false);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    // Check if the user has seen the 2.0.0 modal
    const hasSeen = localStorage.getItem("aiagent-version-seen-2.0.0");
    if (!hasSeen) {
      setOpen(true);
    }
  }, []);

  const handleClose = () => {
    setOpen(false);
    localStorage.setItem("aiagent-version-seen-2.0.0", "true");
  };

  const handleInteractOutside = (e: Event) => {
    e.preventDefault();
    setShake(true);
    setTimeout(() => setShake(false), 150);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) handleClose();
      }}
    >
      <DialogContent
        className={cn(
          "sm:max-w-[500px] transition-transform duration-150 ease-in-out",
          shake ? "scale-[1.02]" : "scale-100",
        )}
        onInteractOutside={handleInteractOutside}
        onEscapeKeyDown={handleInteractOutside}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl font-bold">
            <Sparkles className="size-6 text-[#6FB941]" />
            What's new in AiAgent v2.0.0
          </DialogTitle>
          <DialogDescription className="text-base mt-2">
            We've released a major update to empower your marketing team with
            autonomous intelligence and full workflow execution. Here's what's
            included:
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 size-5 text-[#6FB941]" />
            <div>
              <h4 className="font-medium text-foreground">
                Multi-Channel Marketing Intelligence
              </h4>
              <p className="text-sm text-muted-foreground">
                AiAgent provides end-to-end campaign planning, positioning,
                multi-channel copy generation, and SEO strategy tailored to your
                exact product, target audience, and business goals.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 size-5 text-[#6FB941]" />
            <div>
              <h4 className="font-medium text-foreground">
                Deep Research & Interactive Briefs
              </h4>
              <p className="text-sm text-muted-foreground">
                The agent is now highly interactive. Instead of generic one-shot
                answers, it conducts live web research, asks targeted questions
                to clarify direction, and validates every assumption before
                finalizing outputs.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 size-5 text-[#6FB941]" />
            <div>
              <h4 className="font-medium text-foreground">
                50 Agent Skills & Updated Manual
              </h4>
              <p className="text-sm text-muted-foreground">
                Full access to our open-source library of 50 specialized
                marketing skills, accompanied by a comprehensively updated
                AiAgent user guide and integration manual.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4 sm:justify-between">
          <Button variant="outline" asChild>
            <a
              href="/aiagent-manual.md"
              download="AiAgent User Manual.md"
              onClick={handleClose}
            >
              <Download className="mr-2 size-4" />
              Download Manual
            </a>
          </Button>
          <Button
            onClick={handleClose}
            className="bg-[#6FB941] text-white hover:bg-[#6FB941]/90"
          >
            Got it, thanks!
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
