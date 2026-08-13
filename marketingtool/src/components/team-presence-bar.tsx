"use client";

import { Users, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { UserOption } from "@/components/visibility-selector";

interface TeamPresenceBarProps {
  users: UserOption[];
  currentUserId?: string;
  workspaceName?: string;
}

export function TeamPresenceBar({
  users = [],
  currentUserId,
  workspaceName,
}: TeamPresenceBarProps) {
  if (users.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-gradient-to-r from-card via-card/80 to-purple-500/5 p-3 text-xs shadow-2xs">
      <div className="flex items-center gap-2">
        <div className="flex size-7 items-center justify-center rounded-md bg-purple-500/10 text-purple-600 font-semibold">
          <Users className="size-3.5" />
        </div>
        <div>
          <div className="flex items-center gap-1.5 font-medium text-foreground">
            <span>Marketing Team Workspace</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-purple-500/30 text-purple-700 bg-purple-500/10">
              <UserCheck className="size-2.5 mr-1" />
              {users.length} Active Member{users.length === 1 ? "" : "s"}
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Collaborating on campaigns, AI content, and lead conversion assets
          </p>
        </div>
      </div>

      <TooltipProvider>
        <div className="flex items-center -space-x-1.5 overflow-hidden">
          {users.slice(0, 8).map((user) => {
            const initials = user.name
              ? user.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)
              : user.email.slice(0, 2).toUpperCase();

            return (
              <Tooltip key={user.id}>
                <TooltipTrigger asChild>
                  <div className="relative inline-flex size-7 items-center justify-center rounded-full border-2 border-background bg-purple-100 text-[10px] font-bold text-purple-800 hover:z-10 hover:scale-105 transition-transform cursor-pointer">
                    {initials}
                    <span className="absolute bottom-0 right-0 size-2 rounded-full bg-emerald-500 ring-1 ring-background" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  <p className="font-semibold">{user.name}</p>
                  <p className="text-[10px] text-muted-foreground">{user.email}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
          {users.length > 8 && (
            <div className="relative inline-flex size-7 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px] font-semibold text-muted-foreground">
              +{users.length - 8}
            </div>
          )}
        </div>
      </TooltipProvider>
    </div>
  );
}
