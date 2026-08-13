"use client";

import { Globe, Lock, User, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export type VisibilityStatus = "PUBLIC" | "PRIVATE" | "SHARED";

interface VisibilityBadgeProps {
  visibility?: VisibilityStatus | null;
  sharedCount?: number;
  createdByName?: string | null;
  className?: string;
}

export function VisibilityBadge({
  visibility = "PUBLIC",
  sharedCount = 0,
  createdByName,
  className,
}: VisibilityBadgeProps) {
  return (
    <div className="inline-flex items-center gap-1.5 flex-wrap">
      {visibility === "PRIVATE" && (
        <Badge
          variant="outline"
          className={`gap-1.5 border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium ${className || ""}`}
        >
          <Lock className="size-3" />
          Private
        </Badge>
      )}

      {visibility === "SHARED" && (
        <Badge
          variant="outline"
          className={`gap-1.5 border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400 font-medium ${className || ""}`}
        >
          <Users className="size-3" />
          Shared {sharedCount > 0 ? `(${sharedCount})` : ""}
        </Badge>
      )}

      {visibility === "PUBLIC" && (
        <Badge
          variant="outline"
          className={`gap-1.5 border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium ${className || ""}`}
        >
          <Globe className="size-3" />
          Public
        </Badge>
      )}

      {createdByName && (
        <Badge
          variant="outline"
          className={`gap-1 border-muted-foreground/20 bg-muted/50 text-muted-foreground font-normal text-[11px] ${className || ""}`}
        >
          <User className="size-3 opacity-70" />
          Created by: {createdByName}
        </Badge>
      )}
    </div>
  );
}
