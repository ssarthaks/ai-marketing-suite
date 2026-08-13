"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { PageStatus } from "@prisma/client";
import { ExternalLink, GripVertical, Magnet, Users } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { LEAD_MAGNET_TYPE_LABELS } from "@/lib/constants";
import { updateLeadMagnetStatusAction } from "@/features/lead-magnets/actions/lead-magnet.actions";

type LeadMagnetListItem = Awaited<
  ReturnType<typeof import("@/features/lead-magnets/server/lead-magnets.service").listLeadMagnets>
>[number];

interface LeadMagnetsKanbanProps {
  initialMagnets: LeadMagnetListItem[];
}

const COLUMNS: { status: PageStatus; label: string; color: string }[] = [
  { status: "DRAFT", label: "Draft", color: "bg-slate-500/10 text-slate-700 border-slate-200" },
  { status: "PUBLISHED", label: "Published", color: "bg-emerald-500/10 text-emerald-700 border-emerald-200" },
  { status: "ARCHIVED", label: "Archived", color: "bg-zinc-500/10 text-zinc-600 border-zinc-200" },
];

export function LeadMagnetsKanbanBoard({ initialMagnets }: LeadMagnetsKanbanProps) {
  const [magnets, setMagnets] = useState<LeadMagnetListItem[]>(initialMagnets);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [activeOverColumn, setActiveOverColumn] = useState<PageStatus | null>(null);
  const [, startTransition] = useTransition();

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, columnStatus: PageStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (activeOverColumn !== columnStatus) {
      setActiveOverColumn(columnStatus);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: PageStatus) => {
    e.preventDefault();
    setActiveOverColumn(null);
    const magnetId = draggedId || e.dataTransfer.getData("text/plain");
    if (!magnetId) return;

    const targetMagnet = magnets.find((m) => m.id === magnetId);
    if (!targetMagnet || targetMagnet.status === targetStatus) {
      setDraggedId(null);
      return;
    }

    const previousStatus = targetMagnet.status;
    setMagnets((prev) =>
      prev.map((m) => (m.id === magnetId ? { ...m, status: targetStatus } : m))
    );
    setDraggedId(null);

    toast.info(`Moving "${targetMagnet.title}" to ${targetStatus.toLowerCase()}…`);

    startTransition(async () => {
      const res = await updateLeadMagnetStatusAction(magnetId, targetStatus);
      if (!res.ok) {
        setMagnets((prev) =>
          prev.map((m) => (m.id === magnetId ? { ...m, status: previousStatus } : m))
        );
        toast.error(res.error || "Failed to update status");
      } else {
        toast.success(`Moved to ${targetStatus.toLowerCase()}`);
      }
    });
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-3 md:items-start md:overflow-visible">
      {COLUMNS.map((col) => {
        const columnMagnets = magnets.filter((m) => m.status === col.status);
        const isOver = activeOverColumn === col.status;

        return (
          <div
            key={col.status}
            onDragOver={(e) => handleDragOver(e, col.status)}
            onDrop={(e) => handleDrop(e, col.status)}
            className={`flex w-70 shrink-0 flex-col rounded-xl border p-3 min-h-90 sm:min-h-110 md:w-auto transition-colors ${
              isOver ? "border-purple-500 bg-purple-500/5 ring-2 ring-purple-500/20" : "bg-card/50"
            }`}
          >
            <div className="flex items-center justify-between px-1 py-1.5 mb-2.5 border-b border-border/40">
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${col.color}`}>
                {col.label}
              </span>
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-bold">
                {columnMagnets.length}
              </Badge>
            </div>

            <div className="flex-1 space-y-2.5 overflow-y-auto max-h-105 sm:max-h-162.5 pr-0.5">
              {columnMagnets.length === 0 ? (
                <div className="flex h-28 flex-col items-center justify-center rounded-lg border border-dashed text-center p-2">
                  <p className="text-[11px] text-muted-foreground italic">
                    Drop lead magnets here
                  </p>
                </div>
              ) : (
                columnMagnets.map((magnet) => {
                  const isDragging = draggedId === magnet.id;

                  return (
                    <Card
                      key={magnet.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, magnet.id)}
                      onDragEnd={() => {
                        setDraggedId(null);
                        setActiveOverColumn(null);
                      }}
                      className={`cursor-grab active:cursor-grabbing hover:border-purple-400 hover:shadow-sm transition-all ${
                        isDragging ? "opacity-40 scale-95 border-dashed border-purple-500" : ""
                      }`}
                    >
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-start justify-between gap-1.5">
                          <Link
                            href={`/lead-magnets/${magnet.id}`}
                            className="font-medium text-xs text-foreground hover:text-purple-600 line-clamp-2 leading-snug flex-1"
                          >
                            {magnet.title}
                          </Link>
                          <GripVertical className="size-3.5 text-muted-foreground/50 shrink-0 mt-0.5 cursor-grab" />
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                            {LEAD_MAGNET_TYPE_LABELS[magnet.type] || magnet.type}
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1.5 border-t border-border/30">
                          <span className="flex items-center gap-0.5" title="Leads captured">
                            <Users className="size-3 text-purple-500" />
                            {magnet._count?.leads ?? 0} leads
                          </span>

                          {magnet.status === "PUBLISHED" && (
                            <Link
                              href={`/m/${magnet.slug}`}
                              target="_blank"
                              className="inline-flex items-center gap-0.5 text-purple-600 hover:underline"
                            >
                              View offer <ExternalLink className="size-2.5" />
                            </Link>
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
