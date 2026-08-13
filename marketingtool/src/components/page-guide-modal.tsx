"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { BookOpen, CheckCircle2, HelpCircle, Lightbulb, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getPageGuideForPathname,
  PAGE_GUIDES,
  type PageGuide,
} from "@/config/page-guides";

export const OPEN_PAGE_GUIDE_EVENT = "marketingos:open-page-guide";

export function openPageGuide(guideKey?: string) {
  window.dispatchEvent(
    new CustomEvent(OPEN_PAGE_GUIDE_EVENT, { detail: { guideKey } })
  );
}

export function PageGuideModal() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [activeGuide, setActiveGuide] = useState<PageGuide | null>(null);

  // Check and auto-open guide on first visit to a page
  useEffect(() => {
    const guide = getPageGuideForPathname(pathname);
    if (!guide) return;

    setActiveGuide(guide);

    const storageKey = `marketing_guide_v1_seen_${guide.key}`;
    const hasSeen = localStorage.getItem(storageKey);

    if (!hasSeen) {
      // Small timeout to allow page layout to settle smoothly
      const timer = setTimeout(() => {
        setOpen(true);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [pathname]);

  // Handle manual trigger event (e.g. clicking topbar Guide button)
  useEffect(() => {
    function handleOpenEvent(event: Event) {
      const customEv = event as CustomEvent<{ guideKey?: string }>;
      const requestedKey = customEv.detail?.guideKey;

      if (requestedKey && PAGE_GUIDES[requestedKey]) {
        setActiveGuide(PAGE_GUIDES[requestedKey]);
      } else {
        const guide = getPageGuideForPathname(pathname);
        if (guide) setActiveGuide(guide);
      }

      setOpen(true);
    }

    window.addEventListener(OPEN_PAGE_GUIDE_EVENT, handleOpenEvent);
    return () => {
      window.removeEventListener(OPEN_PAGE_GUIDE_EVENT, handleOpenEvent);
    };
  }, [pathname]);

  const handleDismiss = useCallback(() => {
    if (activeGuide) {
      localStorage.setItem(`marketing_guide_seen_${activeGuide.key}`, "true");
    }
    setOpen(false);
  }, [activeGuide]);

  if (!activeGuide) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => {
      if (!next) handleDismiss();
      else setOpen(next);
    }}>
      <DialogContent className="max-w-xl p-0 overflow-hidden border-border/60 shadow-2xl">
        {/* Decorative Header Banner */}
        <div className="relative bg-gradient-to-r from-primary/15 via-primary/10 to-background p-6 pb-4 border-b border-border/40">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="gap-1.5 border-primary/40 bg-primary/10 text-primary font-medium">
              <Sparkles className="size-3" />
              {activeGuide.badge}
            </Badge>
            <span className="text-xs text-muted-foreground font-mono">First Visit Guide</span>
          </div>
          <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
            {activeGuide.title}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-1">
            {activeGuide.subtitle}
          </DialogDescription>
        </div>

        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Overview */}
          <div className="rounded-lg border bg-muted/30 p-3.5 text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {activeGuide.overview}
          </div>

          {/* Features / Capabilities */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <BookOpen className="size-3.5 text-primary" />
              What You Can Do On This Page
            </h4>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {activeGuide.features.map((feature, idx) => {
                const IconComponent = feature.icon;
                return (
                  <div
                    key={idx}
                    className="flex items-start gap-3 rounded-lg border bg-card p-3 shadow-2xs hover:border-primary/30 transition-colors"
                  >
                    <div className="rounded-md bg-primary/10 p-2 text-primary shrink-0 mt-0.5">
                      <IconComponent className="size-4" />
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">
                        {feature.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 leading-normal">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pro Tip */}
          {activeGuide.proTip && (
            <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-600 dark:text-amber-400">
              <Lightbulb className="size-4 shrink-0 text-amber-500 mt-0.5" />
              <div>
                <span className="font-semibold">Pro Tip: </span>
                <span>{activeGuide.proTip}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 bg-muted/20 border-t flex flex-row items-center justify-between sm:justify-between">
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <CheckCircle2 className="size-3.5 text-emerald-500" />
            <span>Saved to guides checklist</span>
          </div>
          <Button
            size="sm"
            onClick={handleDismiss}
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium px-4"
          >
            Got it, explore page
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
