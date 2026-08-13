"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LeadMagnetType } from "@prisma/client";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { LEAD_MAGNET_TYPE_LABELS } from "@/lib/constants";
import {
  createLeadMagnetAction,
  updateLeadMagnetAction,
} from "@/features/lead-magnets/actions/lead-magnet.actions";
import {
  leadMagnetFormSchema,
  type LeadMagnetFormInput,
} from "@/features/lead-magnets/schemas/lead-magnet.schema";
import {
  VisibilitySelector,
  type UserOption,
} from "@/components/visibility-selector";

const NONE = "__none__";

interface LeadMagnetFormProps {
  magnetId?: string;
  campaigns: { id: string; title: string }[];
  assets: { id: string; name: string }[];
  defaultValues?: Partial<LeadMagnetFormInput>;
}

export function LeadMagnetForm({
  magnetId,
  campaigns,
  assets,
  defaultValues,
}: LeadMagnetFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isEdit = Boolean(magnetId);

  const form = useForm<LeadMagnetFormInput>({
    resolver: zodResolver(leadMagnetFormSchema),
    defaultValues: {
      title: "",
      type: "CHECKLIST",
      description: "",
      body: "",
      assetId: NONE,
      campaignId: NONE,
      ...defaultValues,
    },
  });

  function onSubmit(values: LeadMagnetFormInput) {
    const payload: LeadMagnetFormInput = {
      ...values,
      assetId: values.assetId === NONE ? undefined : values.assetId,
      campaignId: values.campaignId === NONE ? undefined : values.campaignId,
    };
    startTransition(async () => {
      const result = magnetId
        ? await updateLeadMagnetAction(magnetId, payload)
        : await createLeadMagnetAction(payload);
      if (result && !result.ok) {
        toast.error(result.error);
      } else if (magnetId) {
        toast.success("Lead magnet saved");
        router.refresh();
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input
                    placeholder="The 2026 SaaS launch checklist"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.values(LeadMagnetType).map((type) => (
                      <SelectItem key={type} value={type}>
                        {LEAD_MAGNET_TYPE_LABELS[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="campaignId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Campaign</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={NONE}>No campaign</SelectItem>
                    {campaigns.map((campaign) => (
                      <SelectItem key={campaign.id} value={campaign.id}>
                        {campaign.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  rows={2}
                  placeholder="Shown on the public page above the email form."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="body"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Content</FormLabel>
              <FormControl>
                <Textarea
                  rows={10}
                  placeholder={
                    "The content subscribers unlock after leaving their email.\nFor a checklist: one item per line."
                  }
                  className="font-mono text-sm"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Revealed only after a visitor submits their email.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="assetId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Attached file (optional)</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="w-full sm:w-80">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={NONE}>No file</SelectItem>
                  {assets.map((asset) => (
                    <SelectItem key={asset.id} value={asset.id}>
                      {asset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Subscribers get a download link — upload PDFs in Assets first.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2 pt-2">
          {!isEdit && (
            <Button
              type="button"
              variant="ghost"
              disabled={isPending}
              onClick={() => router.back()}
            >
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="size-4 animate-spin" />}
            {isEdit ? "Save changes" : "Create lead magnet"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
