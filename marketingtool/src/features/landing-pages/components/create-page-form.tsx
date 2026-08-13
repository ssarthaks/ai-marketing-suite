"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
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
import { createLandingPageAction } from "@/features/landing-pages/actions/landing-page.actions";
import {
  createLandingPageSchema,
  type CreateLandingPageInput,
} from "@/features/landing-pages/schemas/landing-page.schema";
import {
  VisibilitySelector,
  type UserOption,
} from "@/components/visibility-selector";

const NO_CAMPAIGN = "__none__";

export function CreatePageForm({
  campaigns,
  defaultCampaignId,
}: {
  campaigns: { id: string; title: string }[];
  defaultCampaignId?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<CreateLandingPageInput>({
    resolver: zodResolver(createLandingPageSchema),
    defaultValues: {
      title: "",
      campaignId: defaultCampaignId ?? NO_CAMPAIGN,
    },
  });

  function onSubmit(values: CreateLandingPageInput) {
    startTransition(async () => {
      const result = await createLandingPageAction({
        ...values,
        campaignId:
          values.campaignId === NO_CAMPAIGN ? undefined : values.campaignId,
      });
      if (result && !result.ok) {
        toast.error(result.error);
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Page title</FormLabel>
              <FormControl>
                <Input placeholder="Spring launch — early access" {...field} />
              </FormControl>
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
                  <SelectItem value={NO_CAMPAIGN}>No campaign</SelectItem>
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
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            disabled={isPending}
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="size-4 animate-spin" />}
            Create page
          </Button>
        </div>
      </form>
    </Form>
  );
}
