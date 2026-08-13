"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ExternalLink,
  Globe,
  GlobeLock,
  Loader2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  deleteLeadMagnetAction,
  setLeadMagnetPublishedAction,
} from "@/features/lead-magnets/actions/lead-magnet.actions";

interface MagnetEditorHeaderProps {
  magnet: {
    id: string;
    title: string;
    slug: string;
    status: string;
    leadCount: number;
  };
}

export function MagnetEditorHeader({ magnet }: MagnetEditorHeaderProps) {
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isPublished = magnet.status === "PUBLISHED";

  return (
    <div>
      <Link
        href="/lead-magnets"
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Lead magnets
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">
            {magnet.title}
          </h1>
          <Badge variant={isPublished ? "default" : "secondary"}>
            {isPublished ? "Published" : "Draft"}
          </Badge>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          {isPublished && (
            <Button asChild variant="outline" size="sm">
              <a
                href={`/m/${magnet.slug}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="size-4" />
                View live
              </a>
            </Button>
          )}
          <Button
            size="sm"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                const result = await setLeadMagnetPublishedAction(
                  magnet.id,
                  !isPublished
                );
                if (result.ok) {
                  toast.success(
                    result.data.status === "PUBLISHED"
                      ? `Published at /m/${magnet.slug}`
                      : "Lead magnet unpublished"
                  );
                  router.refresh();
                } else {
                  toast.error(result.error);
                }
              })
            }
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : isPublished ? (
              <GlobeLock className="size-4" />
            ) : (
              <Globe className="size-4" />
            )}
            {isPublished ? "Unpublish" : "Publish"}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground hover:text-destructive"
            onClick={() => setConfirmDelete(true)}
            aria-label="Delete lead magnet"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
      <p className="mt-1.5 text-sm text-muted-foreground">
        /m/{magnet.slug} · {magnet.leadCount} lead
        {magnet.leadCount === 1 ? "" : "s"} captured
      </p>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{magnet.title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              The lead magnet and its public URL will be removed. Captured
              leads are kept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              onClick={(event) => {
                event.preventDefault();
                startTransition(async () => {
                  const result = await deleteLeadMagnetAction(magnet.id);
                  if (result && !result.ok) toast.error(result.error);
                });
              }}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete lead magnet
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
