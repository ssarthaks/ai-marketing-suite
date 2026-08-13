"use client";

import { useEffect, useState } from "react";
import { ChatSidebar } from "./sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { PanelLeftOpen } from "lucide-react";
import { ChatSidebarContext } from "./sidebar-context";

export function ChatLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // keyboard shortcut: cmd/ctrl + b
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        if (isMobile) setMobileOpen((v) => !v);
        else setCollapsed((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isMobile]);

  return (
    <div className="flex h-svh w-full overflow-hidden bg-background text-foreground">
      {!isMobile && (
        <ChatSidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed((value) => !value)}
        />
      )}
      {isMobile && (
        <>
          <div className="absolute left-3 top-3 z-10">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              className="rounded-lg border border-border bg-background/80 backdrop-blur"
            >
              <PanelLeftOpen className="size-4" />
            </Button>
          </div>
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetContent
              side="left"
              className="w-[280px] max-w-[calc(100vw-0.75rem)] p-0"
            >
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <ChatSidebar collapsed={false} />
            </SheetContent>
          </Sheet>
        </>
      )}
      <ChatSidebarContext.Provider
        value={isMobile ? null : () => setCollapsed((value) => !value)}
      >
        <main className="flex min-w-0 flex-1 flex-col">{children}</main>
      </ChatSidebarContext.Provider>
    </div>
  );
}
