"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { PageStatus } from "@prisma/client";
import { Eye, ExternalLink, GripVertical, Layers, Users } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import { updateLandingPageStatusAction } from "@/features/landing-pages/actions/landing-page.actions";

type LandingPageListItem = Awaited<
  ReturnType<typeof import("@/features/landing-pages/server/landing-pages.service").listLandingPages>
>[number];

interface LandingPagesKanbanProps {
  initialPages: LandingPageListItem[];
}

const COLUMNS: { status: PageStatus; label: string; color: string }[] = [
  { status: "DRAFT", label: "Draft", color: "bg-slate-500/10 text-slate-700 border-slate-200" },
  { status: "PUBLISHED", label: "Published", color: "bg-emerald-500/10 text-emerald-700 border-emerald-200" },
  { status: "ARCHIVED", label: "Archived", color: "bg-zinc-500/10 text-zinc-600 border-zinc-200" },
];

export function LandingPagesKanbanBoard({ initialPages }: LandingPagesKanbanProps) {
  const [pages, setPages] = useState<LandingPageListItem[]>(initialPages);
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
    const pageId = draggedId || e.dataTransfer.getData("text/plain");
    if (!pageId) return;

    const targetPage = pages.find((p) => p.id === pageId);
    if (!targetPage || targetPage.status === targetStatus) {
      setDraggedId(null);
      return;
    }

    const previousStatus = targetPage.status;
    setPages((prev) =>
      prev.map((p) => (p.id === pageId ? { ...p, status: targetStatus } : p))
    );
    setDraggedId(null);

    toast.info(`Moving "${targetPage.title}" to ${targetStatus.toLowerCase()}…`);

    startTransition(async () => {
      const res = await updateLandingPageStatusAction(pageId, targetStatus);
      if (!res.ok) {
        setPages((prev) =>
          prev.map((p) => (p.id === pageId ? { ...p, status: previousStatus } : p))
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
        const columnPages = pages.filter((p) => p.status === col.status);
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
                {columnPages.length}
              </Badge>
            </div>

            <div className="flex-1 space-y-2.5 overflow-y-auto max-h-105 sm:max-h-162.5 pr-0.5">
              {columnPages.length === 0 ? (
                <div className="flex h-28 flex-col items-center justify-center rounded-lg border border-dashed text-center p-2">
                  <p className="text-[11px] text-muted-foreground italic">
                    Drop landing pages here
                  </p>
                </div>
              ) : (
                columnPages.map((page) => {
                  const isDragging = draggedId === page.id;

                  return (
                    <Card
                      key={page.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, page.id)}
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
                            href={`/landing-pages/${page.id}`}
                            className="font-medium text-xs text-foreground hover:text-purple-600 line-clamp-2 leading-snug flex-1"
                          >
                            {page.title}
                          </Link>
                          <GripVertical className="size-3.5 text-muted-foreground/50 shrink-0 mt-0.5 cursor-grab" />
                        </div>

                        <p className="text-[10px] text-muted-foreground font-mono truncate">
                          /p/{page.slug}
                        </p>

                        <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1.5 border-t border-border/30">
                          <div className="flex items-center gap-2">
                            <span className="flex items-center gap-0.5" title="Views">
                              <Eye className="size-3 text-blue-500" />
                              {page.views}
                            </span>
                            <span className="flex items-center gap-0.5" title="Leads captured">
                              <Users className="size-3 text-purple-500" />
                              {page._count?.leads ?? 0}
                            </span>
                          </div>

                          {page.status === "PUBLISHED" && (
                            <Link
                              href={`/p/${page.slug}`}
                              target="_blank"
                              className="inline-flex items-center gap-0.5 text-purple-600 hover:underline"
                            >
                              View <ExternalLink className="size-2.5" />
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
