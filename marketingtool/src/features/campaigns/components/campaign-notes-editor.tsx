"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { updateCampaignNotesAction } from "@/features/campaigns/actions/campaign.actions";

interface CampaignNotesEditorProps {
  campaignId: string;
  initialNotes: string;
}

export function CampaignNotesEditor({
  campaignId,
  initialNotes,
}: CampaignNotesEditorProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [savedNotes, setSavedNotes] = useState(initialNotes);
  const [isPending, startTransition] = useTransition();
  const isDirty = notes !== savedNotes;

  function onSave() {
    startTransition(async () => {
      const result = await updateCampaignNotesAction(campaignId, { notes });
      if (result.ok) {
        setSavedNotes(notes);
        toast.success("Notes saved");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="space-y-3">
      <Textarea
        rows={12}
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        placeholder="Strategy, messaging angles, meeting notes, links…"
        className="resize-y font-mono text-sm leading-relaxed"
      />
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {isDirty ? "Unsaved changes" : "All changes saved"}
        </p>
        <Button size="sm" onClick={onSave} disabled={!isDirty || isPending}>
          {isPending && <Loader2 className="size-4 animate-spin" />}
          Save notes
        </Button>
      </div>
    </div>
  );
}
