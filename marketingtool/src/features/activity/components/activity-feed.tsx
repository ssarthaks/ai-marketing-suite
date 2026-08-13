import type { Activity } from "@prisma/client";
import {
  EyeOff,
  Globe,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  UserPlus,
  type LucideIcon,
} from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

const ACTION_ICONS: Record<Activity["action"], LucideIcon> = {
  CREATED: Plus,
  UPDATED: Pencil,
  DELETED: Trash2,
  PUBLISHED: Globe,
  UNPUBLISHED: EyeOff,
  GENERATED: Sparkles,
  UPLOADED: Upload,
  CAPTURED: UserPlus,
};

interface ActivityFeedProps {
  activities: Activity[];
  className?: string;
  emptyDescription?: string;
}

export function ActivityFeed({
  activities,
  className,
  emptyDescription = "Actions across your workspace will show up here.",
}: ActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <EmptyState
        icon={Sparkles}
        title="No activity yet"
        description={emptyDescription}
        className="min-h-[200px] py-10"
      />
    );
  }

  return (
    <ul className={cn("space-y-1", className)}>
      {activities.map((activity) => {
        const Icon = ACTION_ICONS[activity.action];
        return (
          <li
            key={activity.id}
            className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/50"
          >
            <div className="flex size-7 shrink-0 items-center justify-center rounded-full border bg-background">
              <Icon className="size-3.5 text-muted-foreground" />
            </div>
            <p className="min-w-0 flex-1 truncate text-sm">{activity.title}</p>
            <time className="shrink-0 text-xs text-muted-foreground">
              {formatRelative(activity.createdAt)}
            </time>
          </li>
        );
      })}
    </ul>
  );
}
