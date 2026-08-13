"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CampaignStatus } from "@prisma/client";
import {
  Calendar,
  DollarSign,
  FileText,
  FolderOpen,
  GripVertical,
  Layers,
  PanelsTopLeft,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CAMPAIGN_STATUS_LABELS } from "@/lib/constants";
import { formatDate, formatNumber } from "@/lib/format";
import { updateCampaignStatusAction } from "@/features/campaigns/actions/campaign.actions";
import type { CampaignListItem } from "@/features/campaigns/server/campaigns.service";

interface CampaignsKanbanBoardProps {
  initialCampaigns: CampaignListItem[];
}

const COLUMNS: { status: CampaignStatus; label: string; color: string; badge: string }[] = [
  { status: "DRAFT", label: "Draft", color: "bg-slate-500/10 text-slate-700 border-slate-200", badge: "bg-slate-100 text-slate-700" },
  { status: "ACTIVE", label: "Active", color: "bg-emerald-500/10 text-emerald-700 border-emerald-200", badge: "bg-emerald-100 text-emerald-700" },
  { status: "PAUSED", label: "Paused", color: "bg-amber-500/10 text-amber-700 border-amber-200", badge: "bg-amber-100 text-amber-700" },
  { status: "COMPLETED", label: "Completed", color: "bg-blue-500/10 text-blue-700 border-blue-200", badge: "bg-blue-100 text-blue-700" },
  { status: "ARCHIVED", label: "Archived", color: "bg-zinc-500/10 text-zinc-600 border-zinc-200", badge: "bg-zinc-100 text-zinc-600" },
];

export function CampaignsKanbanBoard({ initialCampaigns }: CampaignsKanbanBoardProps) {
  const [campaigns, setCampaigns] = useState<CampaignListItem[]>(initialCampaigns);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleDragStart(e: React.DragEvent, id: string) {
    setDraggedId(id);
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  function handleDrop(e: React.DragEvent, targetStatus: CampaignStatus) {
    e.preventDefault();
    if (!draggedId) return;

    const campaign = campaigns.find((c) => c.id === draggedId);
    if (!campaign || campaign.status === targetStatus) {
      setDraggedId(null);
      return;
    }

    const prevCampaigns = [...campaigns];
    setCampaigns((current) =>
      current.map((c) => (c.id === draggedId ? { ...c, status: targetStatus } : c))
    );
    setDraggedId(null);

    startTransition(async () => {
      const result = await updateCampaignStatusAction(draggedId, targetStatus);
      if (!result.ok) {
        setCampaigns(prevCampaigns);
        toast.error(result.error);
      } else {
        toast.success(`Moved to ${CAMPAIGN_STATUS_LABELS[targetStatus]}`);
      }
    });
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-3 md:overflow-visible lg:grid-cols-5">
      {COLUMNS.map((col) => {
        const colCampaigns = campaigns.filter((c) => c.status === col.status);
        return (
          <div
            key={col.status}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, col.status)}
            className="flex w-65 shrink-0 flex-col rounded-lg border bg-muted/20 p-2 min-h-90 sm:min-h-125 md:w-auto"
          >
            <div className="flex items-center justify-between px-2 py-1.5 mb-2">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <span className={`size-2 rounded-full ${col.badge}`} />
                {col.label}
              </span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                {colCampaigns.length}
              </Badge>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto max-h-105 sm:max-h-175">
              {colCampaigns.length === 0 ? (
                <div className="flex h-28 flex-col items-center justify-center rounded-lg border border-dashed text-center p-2">
                  <p className="text-[11px] text-muted-foreground italic">
                    Drop campaigns here
                  </p>
                </div>
              ) : (
                colCampaigns.map((campaign) => {
                  const isDragging = draggedId === campaign.id;
                  return (
                    <Card
                      key={campaign.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, campaign.id)}
                      className={`cursor-grab active:cursor-grabbing hover:border-purple-300 transition-all shadow-xs ${
                        isDragging ? "opacity-40 scale-95 border-dashed border-purple-500" : ""
                      }`}
                    >
                      <CardContent className="p-3 space-y-2.5">
                        <div className="flex items-start justify-between gap-1.5">
                          <Link
                            href={`/campaigns/${campaign.id}`}
                            className="font-medium text-xs text-foreground hover:text-purple-600 line-clamp-2 leading-snug flex-1"
                          >
                            {campaign.title}
                          </Link>
                          <GripVertical className="size-3.5 text-muted-foreground/50 shrink-0 mt-0.5 cursor-grab" />
                        </div>

                        {campaign.product && (
                          <p className="text-[10px] text-muted-foreground line-clamp-1">
                            Target: {campaign.product}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted-foreground pt-1 border-t border-border/30">
                          {campaign.budget !== null && (
                            <span className="flex items-center gap-0.5 text-foreground font-medium">
                              <DollarSign className="size-3 text-emerald-600" />
                              {formatNumber(campaign.budget)}
                            </span>
                          )}
                          {campaign.startDate && (
                            <span className="flex items-center gap-0.5">
                              <Calendar className="size-3" />
                              {formatDate(campaign.startDate)}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1">
                          <div className="flex items-center gap-2">
                            <span className="flex items-center gap-0.5" title="Content generations">
                              <FileText className="size-3" />
                              {campaign._count?.contentGenerations ?? 0}
                            </span>
                            <span className="flex items-center gap-0.5" title="Landing pages">
                              <PanelsTopLeft className="size-3" />
                              {campaign._count?.landingPages ?? 0}
                            </span>
                            <span className="flex items-center gap-0.5" title="Assets">
                              <FolderOpen className="size-3" />
                              {campaign._count?.assets ?? 0}
                            </span>
                          </div>

                          {campaign.createdBy?.name && (
                            <span className="truncate max-w-20 font-medium text-[9px] bg-muted px-1.5 py-0.5 rounded">
                              {campaign.createdBy.name.split(" ")[0]}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
