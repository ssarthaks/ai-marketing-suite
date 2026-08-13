import type { CampaignStatus } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { CAMPAIGN_STATUS_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<CampaignStatus, string> = {
  DRAFT: "bg-muted text-muted-foreground border-transparent",
  ACTIVE:
    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  PAUSED:
    "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  COMPLETED:
    "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  ARCHIVED: "bg-transparent text-muted-foreground border-border",
};

export function CampaignStatusBadge({
  status,
  className,
}: {
  status: CampaignStatus;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn("font-medium", STATUS_STYLES[status], className)}
    >
      {CAMPAIGN_STATUS_LABELS[status]}
    </Badge>
  );
}
