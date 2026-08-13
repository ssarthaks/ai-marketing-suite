"use client";

import { useState, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import { Copy, MoreHorizontal, Star, Trash2 } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  deleteContentAction,
  duplicateContentAction,
  toggleFavoriteAction,
} from "@/features/library/actions/content.actions";

interface ContentActionsMenuProps {
  contentId: string;
  contentTitle: string;
  isFavorite: boolean;
  /** When rendered on the detail page, deletion should navigate back to the library. */
  redirectOnDelete?: boolean;
}

export function ContentActionsMenu({
  contentId,
  contentTitle,
  isFavorite,
  redirectOnDelete = false,
}: ContentActionsMenuProps) {
  const router = useRouter();
  const params = useParams<{ workspaceId?: string }>();
  const prefix = params?.workspaceId ? `/${params.workspaceId}` : "";
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label="Content actions"
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem
            disabled={isPending}
            onSelect={() =>
              startTransition(async () => {
                const result = await toggleFavoriteAction(contentId);
                if (result.ok) {
                  router.refresh();
                } else {
                  toast.error(result.error);
                }
              })
            }
          >
            <Star
              className={isFavorite ? "fill-amber-400 text-amber-400" : ""}
            />
            {isFavorite ? "Unfavorite" : "Favorite"}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={isPending}
            onSelect={() =>
              startTransition(async () => {
                const result = await duplicateContentAction(contentId);
                if (result.ok) {
                  toast.success("Duplicated");
                  router.push(`${prefix}/library/${result.data.id}`);
                } else {
                  toast.error(result.error);
                }
              })
            }
          >
            <Copy />
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => setConfirmDelete(true)}
          >
            <Trash2 />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{contentTitle}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This generation will be permanently removed from your library.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              onClick={(event) => {
                event.preventDefault();
                startTransition(async () => {
                  const result = await deleteContentAction(contentId, {
                    redirectToLibrary: redirectOnDelete,
                  });
                  if (result && !result.ok) {
                    toast.error(result.error);
                  } else if (!redirectOnDelete) {
                    setConfirmDelete(false);
                    router.refresh();
                  }
                });
              }}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
