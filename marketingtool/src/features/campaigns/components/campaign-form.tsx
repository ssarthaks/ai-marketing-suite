"use client";

import { useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CampaignStatus } from "@prisma/client";
import { CalendarIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CAMPAIGN_STATUS_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import {
  createCampaignAction,
  updateCampaignAction,
} from "@/features/campaigns/actions/campaign.actions";
import {
  campaignFormSchema,
  type CampaignFormInput,
} from "@/features/campaigns/schemas/campaign.schema";

import {
  VisibilitySelector,
  type UserOption,
} from "@/components/visibility-selector";

interface CampaignFormProps {
  campaignId?: string;
  defaultValues?: Partial<CampaignFormInput>;
  isPersonalWorkspace?: boolean;
  users?: UserOption[];
}

const PROJECTS = [
  { id: "demo-saas", name: "Demo SaaS (Acme Suite)" },
  { id: "demo-edtech", name: "Demo EdTech (EduSpark)" },
  { id: "demo-ecommerce", name: "Demo E-Commerce (ArtisanCraft)" },
];

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: Date;
  onChange: (date?: Date) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
          )}
        >
          <CalendarIcon className="size-4" />
          {value ? formatDate(value) : label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={value} onSelect={onChange} />
      </PopoverContent>
    </Popover>
  );
}

export function CampaignForm({
  campaignId,
  defaultValues,
  isPersonalWorkspace,
  users = [],
}: CampaignFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isEdit = Boolean(campaignId);

  const form = useForm<CampaignFormInput>({
    resolver: zodResolver(campaignFormSchema),
    defaultValues: {
      title: "",
      description: "",
      audience: "",
      product: "",
      objective: "",
      budget: "",
      status: "DRAFT",
      visibility: "PUBLIC",
      sharedWithUserIds: [],
      ...defaultValues,
    },
  });

  const applyPreset = (preset: {
    title: string;
    audience: string;
    product: string;
    objective: string;
    budget: string;
    description: string;
  }) => {
    form.setValue("title", preset.title);
    form.setValue("audience", preset.audience);
    form.setValue("product", preset.product);
    form.setValue("objective", preset.objective);
    form.setValue("budget", preset.budget);
    form.setValue("description", preset.description);
    toast.info(`Applied "${preset.title}" template`);
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((data) => {
          startTransition(async () => {
            const result = isEdit
              ? await updateCampaignAction(campaignId!, data)
              : await createCampaignAction(data);

            if (!result.ok) {
              toast.error(result.error);
              return;
            }

            toast.success(isEdit ? "Campaign updated" : "Campaign created", {
              description: "Your changes have been saved.",
            });

            if (!isEdit && result.data && "id" in result.data) {
              router.push(`/campaigns/${result.data.id}`);
            }
            router.refresh();
          });
        })}
        className="space-y-8 pt-6"
      >
        {!isEdit && (
          <div className="rounded-lg border bg-muted/30 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                ⚡ Marketing Campaign Presets (1-Click Fill)
              </span>
              <span className="text-[11px] text-muted-foreground">
                Pre-configured multi-channel strategies for modern growth teams
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs bg-background hover:bg-muted"
                onClick={() =>
                  applyPreset({
                    title: "Q3 SaaS Product Launch Blitz",
                    audience:
                      "Early-stage founders, engineering leads & tech teams",
                    product: "Core SaaS Platform & Workflow Automations",
                    objective:
                      "1,000 product signups & Product Hunt top 3 finish",
                    budget: "3500",
                    description:
                      "Multi-channel launch campaign combining Product Hunt, tech community outreach, social teasers, and founder-led content.",
                  })
                }
              >
                🚀 Product Launch Blitz
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs bg-background hover:bg-muted"
                onClick={() =>
                  applyPreset({
                    title: "Content Marketing & SEO Authority Drive",
                    audience:
                      "In-market buyers searching for high-intent comparison terms",
                    product: "Flagship Software Solution",
                    objective: "50% increase in organic inbound demo requests",
                    budget: "2000",
                    description:
                      "Comprehensive SEO content sprint delivering comparison pages, problem-solution guides, and authoritative cluster hubs.",
                  })
                }
              >
                📖 SEO & Content Drive
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs bg-background hover:bg-muted"
                onClick={() =>
                  applyPreset({
                    title: "Lead Generation Webinar & Masterclass",
                    audience:
                      "Growth marketers, demand gen managers & agency leads",
                    product: "Enterprise Tier & Advanced Analytics",
                    objective:
                      "400 live webinar registrants & 50 qualified pipeline leads",
                    budget: "1500",
                    description:
                      "Live educational masterclass walking through actionable frameworks with interactive Q&A and demo follow-ups.",
                  })
                }
              >
                🎙️ Lead Gen Webinar
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs bg-background hover:bg-muted"
                onClick={() =>
                  applyPreset({
                    title: "Customer Retention & Account Expansion",
                    audience:
                      "Existing subscribers & churn-risk active accounts",
                    product: "Add-on Features & Premium Plan Tier",
                    objective:
                      "25% annual plan upgrades & 15% reduction in monthly churn",
                    budget: "1200",
                    description:
                      "Targeted lifecycle email sequence and personalized in-app notifications highlighting underutilized features and annual savings.",
                  })
                }
              >
                🔄 Retention & Upsell
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs bg-background hover:bg-muted"
                onClick={() =>
                  applyPreset({
                    title: "Strategic B2B Account Outreach Sprint",
                    audience: "VPs of Marketing, CMOs & Commercial Directors",
                    product: "Enterprise Marketing OS",
                    objective:
                      "30 executive demo calls booked with qualified accounts",
                    budget: "4000",
                    description:
                      "Multi-touch outbound cadence across LinkedIn, personalized email briefs, and custom teardown assets.",
                  })
                }
              >
                🏢 Strategic B2B Outreach
              </Button>
            </div>
          </div>
        )}
        {isPersonalWorkspace && !isEdit && (
          <FormField
            control={form.control}
            name="selectedProductKey"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Project (Required)</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a project workspace for this campaign" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {PROJECTS.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Spring product launch" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  rows={3}
                  placeholder="What is this campaign about?"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="audience"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Target audience</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. B2B founders, 25–45" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="product"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Product / service</FormLabel>
                <FormControl>
                  <Input placeholder="What are you promoting?" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="objective"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Objective</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g. 500 signups, brand awareness"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="budget"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Budget (USD)</FormLabel>
                <FormControl>
                  <Input inputMode="decimal" placeholder="5000" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Start date</FormLabel>
                <DateField
                  label="Pick a start date"
                  value={field.value}
                  onChange={field.onChange}
                />
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>End date</FormLabel>
                <DateField
                  label="Pick an end date"
                  value={field.value}
                  onChange={field.onChange}
                />
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.values(CampaignStatus).map((status) => (
                      <SelectItem key={status} value={status}>
                        {CAMPAIGN_STATUS_LABELS[status]}
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
          name="visibility"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <VisibilitySelector
                  visibility={field.value}
                  sharedWithUserIds={form.watch("sharedWithUserIds") || []}
                  onChangeVisibility={field.onChange}
                  onChangeSharedWithUserIds={(ids) =>
                    form.setValue("sharedWithUserIds", ids)
                  }
                  users={users}
                  disabled={isPending}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-2">
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
            {isEdit ? "Save changes" : "Create campaign"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
