"use client";

import { usePathname } from "next/navigation";
import { HelpCircle, Layers, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { activeNavItem } from "@/lib/navigation";
import { openCommandPalette } from "./command-palette";
import { openPageGuide } from "@/components/page-guide-modal";

interface TopbarProps {
  projectName: string;
  isProject: boolean;
}

export function Topbar({ projectName, isProject }: TopbarProps) {
  const pathname = usePathname();
  const active = activeNavItem(pathname);

  return (
    <header className="sticky top-0 z-40 flex h-14 min-w-0 shrink-0 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 h-4!" />
      <span className="min-w-0 truncate text-sm font-medium">
        {active?.title ?? "Workspace"}
      </span>

      <div className="ml-auto flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-56 justify-start gap-2 px-3 text-muted-foreground max-md:w-8 max-md:justify-center max-md:px-0"
          onClick={openCommandPalette}
        >
          <Search className="size-4" />
          <span className="max-md:hidden">Search…</span>
          <kbd className="pointer-events-none ml-auto inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground max-md:hidden">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>
      </div>
    </header>
  );
}
