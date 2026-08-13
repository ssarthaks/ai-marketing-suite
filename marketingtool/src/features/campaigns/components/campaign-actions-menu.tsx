"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CampaignStatus } from "@prisma/client";
import { CircleDot, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
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
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CAMPAIGN_STATUS_LABELS } from "@/lib/constants";
import {
  deleteCampaignAction,
  updateCampaignStatusAction,
} from "@/features/campaigns/actions/campaign.actions";

interface CampaignActionsMenuProps {
  campaignId: string;
  campaignTitle: string;
  currentStatus: CampaignStatus;
}

export function CampaignActionsMenu({
  campaignId,
  campaignTitle,
  currentStatus,
}: CampaignActionsMenuProps) {
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  function onChangeStatus(status: CampaignStatus) {
    startTransition(async () => {
      const result = await updateCampaignStatusAction(campaignId, status);
      if (result.ok) {
        toast.success(`Campaign moved to ${CAMPAIGN_STATUS_LABELS[status]}`);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function onDelete() {
    startTransition(async () => {
      const result = await deleteCampaignAction(campaignId);
      if (result && !result.ok) {
        toast.error(result.error);
      }
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label="Campaign actions"
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem asChild>
            <Link href={`/campaigns/${campaignId}/edit`}>
              <Pencil />
              Edit
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <CircleDot className="mr-2 size-4 text-muted-foreground" />
              Set status
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                {Object.values(CampaignStatus).map((status) => (
                  <DropdownMenuItem
                    key={status}
                    disabled={status === currentStatus || isPending}
                    onSelect={() => onChangeStatus(status)}
                  >
                    {CAMPAIGN_STATUS_LABELS[status]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
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
            <AlertDialogTitle>Delete “{campaignTitle}”?</AlertDialogTitle>
            <AlertDialogDescription>
              The campaign will be permanently deleted. Generated content,
              assets, and landing pages linked to it are kept and simply
              unlinked.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              onClick={(event) => {
                event.preventDefault();
                onDelete();
              }}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete campaign
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
