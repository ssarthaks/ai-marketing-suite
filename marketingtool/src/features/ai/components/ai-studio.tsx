"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ExternalLink,
  Loader2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { CopyButton } from "@/components/copy-button";
import { MarkdownContent } from "@/components/markdown-content";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  EDTECH_PROJECTS,
  CONTENT_TYPE_LABELS,
  TONES,
  type Tone,
} from "@/lib/constants";
import { generateContentAction } from "@/features/ai/actions/ai.actions";
import {
  generateContentSchema,
  type GenerateContentInput,
  type StudioContentType,
} from "@/features/ai/schemas/generate.schema";
import type { GeneratedContentDTO } from "@/features/ai/types";
import {
  VisibilitySelector,
  type UserOption,
} from "@/components/visibility-selector";

const NO_CAMPAIGN = "__none__";
const NO_PROJECT = "__none__";

const TYPE_GROUPS: { label: string; types: StudioContentType[] }[] = [
  {
    label: "Long form",
    types: [
      "BLOG_POST",
      "LANDING_PAGE_COPY",
      "PRESS_RELEASE",
    ],
  },
  { label: "Ads", types: ["GOOGLE_ADS", "META_ADS"] },
  { label: "SEO & conversion", types: ["SEO_META", "KEYWORDS", "CTA"] },
  { label: "Video", types: ["YOUTUBE_SCRIPT"] },
];

interface PromptPreset {
  id: string;
  label: string;
  titleOnly: string;
  category: string;
  projectKey: string;
  type: StudioContentType;
  tone: Tone;
  audience: string;
  goal: string;
  prompt: string;
}

const DEMO_PRESETS: PromptPreset[] = [
  {
    id: "demo_saas_launch",
    label: "Demo SaaS: AI Workflow Launch Announcement",
    titleOnly: "AI Workflow Launch Announcement",
    category: "Demo SaaS",
    projectKey: "demo-saas",
    type: "BLOG_POST",
    tone: "professional",
    audience: "Engineering Leaders & Product Managers",
    goal: "Product trial signups • Announcement blog",
    prompt: "Write a high-converting announcement blog post introducing Acme Cloud Suite's AI Task Copilot and automated workflow canvas, focusing on efficiency gains and developer productivity.",
  },
  {
    id: "demo_edtech_guide",
    label: "Demo EdTech: Adaptive Learning Guide",
    titleOnly: "Adaptive Learning Guide",
    category: "Demo EdTech",
    projectKey: "demo-edtech",
    type: "BLOG_POST",
    tone: "inspirational",
    audience: "Educators and Students",
    goal: "Platform registration • Educational content",
    prompt: "Write a comprehensive guide explaining how EduSpark's adaptive AI tutoring engine personalizes learning paths and helps students master complex subjects.",
  },
];

const STUDIO_PRESETS = DEMO_PRESETS;

interface AiStudioProps {
  campaigns: { id: string; title: string }[];
  defaultCampaignId?: string;
  defaultTone: Tone;
  availableProjects?: string[];
  users?: UserOption[];
}

export function AiStudio({
  campaigns,
  defaultCampaignId,
  defaultTone,
  availableProjects = [],
  users = [],
}: AiStudioProps) {
  const [result, setResult] = useState<GeneratedContentDTO | null>(null);
  const [isPending, startTransition] = useTransition();
  const projectOptions = availableProjects.map((projectKey) => ({
    id: projectKey,
    name:
      EDTECH_PROJECTS.find((project) => project.id === projectKey)?.name ??
      projectKey,
  }));
  const visiblePresets = STUDIO_PRESETS.filter(
    (preset) =>
      projectOptions.some((project) => project.id === preset.projectKey),
  );

  const form = useForm<GenerateContentInput>({
    resolver: zodResolver(generateContentSchema),
    defaultValues: {
      type: "BLOG_POST",
      tone: defaultTone,
      audience: "",
      goal: "",
      prompt: "",
      campaignId: defaultCampaignId ?? NO_CAMPAIGN,
      projectKey: NO_PROJECT,
    },
  });

  function onSubmit(values: GenerateContentInput) {
    startTransition(async () => {
      const response = await generateContentAction({
        ...values,
        campaignId:
          values.campaignId === NO_CAMPAIGN ? undefined : values.campaignId,
        projectKey:
          values.projectKey === NO_PROJECT ? undefined : values.projectKey,
        skills: undefined,
      });

      if (!response.ok) {
        toast.error(response.error);
        return;
      }

      setResult(response.data);
      toast.success("Standalone asset generated and saved.");
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
      <Card className="h-fit lg:sticky lg:top-20 max-h-[calc(100vh-6rem)] overflow-y-auto">
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Quick EdTech AI Prompt Presets Dropdown */}
              {visiblePresets.length > 0 && (
                <div className="space-y-1.5 p-3 rounded-lg border bg-gradient-to-r from-purple-500/10 via-primary/5 to-muted/30 border-purple-500/30">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    🎓 EdTech AI Prompt Presets
                  </span>
                  <span className="text-[10px] text-muted-foreground font-normal">
                    Preselect product & brief
                  </span>
                </label>
                <Select
                  onValueChange={(presetId) => {
                    const preset = visiblePresets.find((p) => p.id === presetId);
                    if (!preset) return;
                    form.setValue("projectKey", preset.projectKey);
                    form.setValue("type", preset.type);
                    form.setValue("tone", preset.tone);
                    form.setValue("audience", preset.audience);
                    form.setValue("goal", preset.goal);
                    form.setValue("prompt", preset.prompt);
                    toast.success(`Loaded preset: ${preset.category}`);
                  }}
                >
                  <SelectTrigger className="w-full text-xs h-9 bg-background">
                    <SelectValue placeholder="Choose an EdTech Product Preset..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[360px] overflow-y-auto">
                    {Array.from(new Set(visiblePresets.map((p) => p.category))).map((category) => (
                      <SelectGroup key={category} className="mb-2">
                        <SelectLabel className="px-2 py-1 text-[11px] font-bold text-primary bg-primary/10 rounded-sm my-1 flex items-center gap-1">
                          🎯 {category}
                        </SelectLabel>
                        {visiblePresets.filter((p) => p.category === category).map((preset) => (
                          <SelectItem key={preset.id} value={preset.id} className="text-xs py-1.5 pl-3">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-semibold text-foreground">{preset.titleOnly}</span>
                              <span className="text-[10px] text-muted-foreground line-clamp-1">{preset.goal}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
                </div>
              )}

              <FormField
                control={form.control}
                name="projectKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project / Product Context</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || NO_PROJECT}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full text-xs">
                          <SelectValue placeholder="Select an EdTech Project" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NO_PROJECT} className="text-xs">
                          None (General)
                        </SelectItem>
                        {projectOptions.map((p) => (
                          <SelectItem
                            key={p.id}
                            value={p.id}
                            className="text-xs"
                          >
                            {p.name}
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
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TYPE_GROUPS.map((group) => (
                          <SelectGroup key={group.label}>
                            <SelectLabel>{group.label}</SelectLabel>
                            {group.types.map((type) => (
                              <SelectItem key={type} value={type}>
                                {CONTENT_TYPE_LABELS[type]}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="tone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tone</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full capitalize">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TONES.map((tone) => (
                            <SelectItem
                              key={tone}
                              value={tone}
                              className="capitalize"
                            >
                              {tone}
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
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="None" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={NO_CAMPAIGN}>
                            No campaign
                          </SelectItem>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="audience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Audience</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. SaaS founders" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="goal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Goal</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. signups" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="prompt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Brief
                      <span style={{ color: "#e7000b", fontSize: "20px", marginLeft:"-5px" }}>
                        *
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        rows={3}
                        placeholder="Describe the single asset you want generated."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="visibility"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <VisibilitySelector
                        visibility={field.value || "PUBLIC"}
                        sharedWithUserIds={
                          form.watch("sharedWithUserIds") || []
                        }
                        onChangeVisibility={field.onChange}
                        onChangeSharedWithUserIds={(ids) =>
                          form.setValue("sharedWithUserIds", ids)
                        }
                        users={users}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? (
                  <Loader2 className="size-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="size-4 mr-2" />
                )}
                Generate Standalone Asset
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="min-w-0 overflow-hidden">
        {isPending ? (
          <CardContent className="space-y-4 p-6">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-4/5" />
          </CardContent>
        ) : result ? (
          <>
            <CardHeader className="border-b">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle className="truncate text-base">
                    {result.title}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    One {CONTENT_TYPE_LABELS[result.type].toLowerCase()} asset
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <CopyButton value={result.content} />
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/library/${result.id}`}>
                      Open saved asset
                      <ExternalLink className="ml-1.5 size-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <MarkdownContent content={result.content} />
            </CardContent>
          </>
        ) : (
          <CardContent className="flex min-h-[420px] flex-col items-center justify-center bg-muted/20 p-10 text-center">
            <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-muted">
              <Sparkles className="size-6 text-muted-foreground" />
            </div>
            <h3 className="text-base font-semibold">Standalone Asset Studio</h3>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Choose one asset type and enter a brief. Research reports,
              optimization audits, repurposing blueprints, email drips,
              organic social campaigns, and battlecards stay in their
              dedicated tools.
            </p>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
