"use client";

import { useState, useTransition } from "react";
import {
  Clock,
  Copy,
  History,
  Loader2,
  Share2,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { MarkdownContent } from "@/components/markdown-content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  generateSocialArchitectAction,
  listSocialArchitectHistoryAction,
  type SocialArchitectHistoryItem,
  type SocialArchitectResult,
  type SocialPlatform,
} from "@/features/ai/actions/ai-social-architect.actions";
import { EDTECH_PROJECTS } from "@/lib/constants";
import { formatDate } from "@/lib/format";

const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  LINKEDIN: "LinkedIn Carousel",
  INSTAGRAM_REELS: "Instagram Reel",
  X: "X Thread",
};

function OutputPanel({
  title,
  content,
}: {
  title: string;
  content: string;
}) {
  function copy() {
    navigator.clipboard
      .writeText(content)
      .then(() => toast.success(`${title} copied.`))
      .catch(() => toast.error("Could not copy this section."));
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between border-b py-3">
        <CardTitle className="text-sm">{title}</CardTitle>
        <Button variant="outline" size="sm" onClick={copy}>
          <Copy className="mr-1.5 size-3.5" />
          Copy
        </Button>
      </CardHeader>
      <CardContent className="p-5">
        <MarkdownContent content={content} />
      </CardContent>
    </Card>
  );
}

export function AiSocialArchitectView() {
  const queryClient = useQueryClient();
  const [campaignTopic, setCampaignTopic] = useState(
    "Three high-impact automation habits for engineering and product teams",
  );
  const [targetPlatform, setTargetPlatform] =
    useState<SocialPlatform>("LINKEDIN");
  const [targetProductKey, setTargetProductKey] =
    useState("demo-saas");
  const [visibility, setVisibility] = useState<"PRIVATE" | "PUBLIC">(
    "PRIVATE",
  );
  const [result, setResult] = useState<SocialArchitectResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const { data: history = [] } = useQuery({
    queryKey: ["ai-social-architect-history"],
    queryFn: async () => {
      const response = await listSocialArchitectHistoryAction();
      return response.ok ? response.data : [];
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  function onGenerate() {
    startTransition(async () => {
      const response = await generateSocialArchitectAction(
        campaignTopic,
        targetPlatform,
        targetProductKey,
        visibility,
      );
      if (!response.ok) {
        toast.error(response.error);
        return;
      }
      setResult(response.data);
      await queryClient.invalidateQueries({
        queryKey: ["ai-social-architect-history"],
      });
      toast.success(
        `${PLATFORM_LABELS[targetPlatform]} campaign generated and saved.`,
      );
    });
  }

  function loadFromHistory(item: SocialArchitectHistoryItem) {
    setResult(item.data);
    setCampaignTopic(item.data.campaignTopic);
    setTargetPlatform(item.data.targetPlatform);
    setTargetProductKey(item.data.projectName);
    setIsSheetOpen(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Share2 className="size-6 text-primary" />
          AI Social Architect
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create one organic asset for one selected platform, then get its
          publishing and engagement plan. Paid ads and email stay in their
          dedicated tools.
        </p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-12">
        <Card className="border-border/80 shadow-sm lg:col-span-5">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="size-4 text-primary" />
                Organic Platform Brief
              </CardTitle>
              <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm">
                    <History className="mr-1.5 size-3.5" />
                    History ({history.length})
                  </Button>
                </SheetTrigger>
                <SheetContent className="overflow-y-auto sm:max-w-md">
                  <SheetHeader>
                    <SheetTitle>Saved Organic Campaigns</SheetTitle>
                    <SheetDescription>
                      Only current, isolated social outputs appear here.
                    </SheetDescription>
                  </SheetHeader>
                  <div className="mt-5 space-y-2">
                    {history.length === 0 ? (
                      <p className="py-8 text-center text-sm text-muted-foreground">
                        No current-format social campaigns yet.
                      </p>
                    ) : (
                      history.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => loadFromHistory(item)}
                          className="w-full rounded-lg border p-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="line-clamp-2 text-sm font-medium">
                              {item.title}
                            </span>
                            <Badge variant="secondary">
                              {PLATFORM_LABELS[item.data.targetPlatform]}
                            </Badge>
                          </div>
                          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                            <span>{item.data.projectName}</span>
                            <span>{formatDate(item.createdAt)}</span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
            <CardDescription>
              The platform selection is enforced by the output schema.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Product context</label>
              <Select
                value={targetProductKey}
                onValueChange={setTargetProductKey}
                disabled={isPending}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EDTECH_PROJECTS.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Organic platform</label>
              <Select
                value={targetPlatform}
                onValueChange={(value) =>
                  setTargetPlatform(value as SocialPlatform)
                }
                disabled={isPending}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LINKEDIN">LinkedIn Carousel</SelectItem>
                  <SelectItem value="INSTAGRAM_REELS">
                    Instagram Reel
                  </SelectItem>
                  <SelectItem value="X">X Thread</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Topic or angle</label>
              <Input
                value={campaignTopic}
                onChange={(event) => setCampaignTopic(event.target.value)}
                disabled={isPending}
                placeholder="What should this organic asset communicate?"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Visibility</label>
              <Select
                value={visibility}
                onValueChange={(value) =>
                  setVisibility(value as "PRIVATE" | "PUBLIC")
                }
                disabled={isPending}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRIVATE">Private</SelectItem>
                  <SelectItem value="PUBLIC">Workspace</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              className="w-full"
              onClick={onGenerate}
              disabled={isPending || !campaignTopic.trim()}
            >
              {isPending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Share2 className="mr-2 size-4" />
              )}
              Generate {PLATFORM_LABELS[targetPlatform]}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4 lg:col-span-7">
          {isPending ? (
            <Card className="py-20 text-center">
              <Loader2 className="mx-auto size-8 animate-spin text-primary" />
              <p className="mt-3 text-sm font-medium">
                Creating one {PLATFORM_LABELS[targetPlatform]} asset…
              </p>
            </Card>
          ) : result ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Badge variant="outline">{result.campaignTitle}</Badge>
                <Badge>{PLATFORM_LABELS[result.targetPlatform]}</Badge>
              </div>
              <Tabs defaultValue="asset">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="asset">Platform Asset</TabsTrigger>
                  <TabsTrigger value="plan">Publishing Plan</TabsTrigger>
                  <TabsTrigger value="engagement">Engagement</TabsTrigger>
                </TabsList>
                <TabsContent value="asset" className="mt-4">
                  <OutputPanel
                    title={PLATFORM_LABELS[result.targetPlatform]}
                    content={result.platformOutput}
                  />
                </TabsContent>
                <TabsContent value="plan" className="mt-4">
                  <OutputPanel
                    title="Publishing Plan"
                    content={result.publishingPlan}
                  />
                </TabsContent>
                <TabsContent value="engagement" className="mt-4">
                  <OutputPanel
                    title="Engagement Playbook"
                    content={result.engagementPlaybook}
                  />
                </TabsContent>
              </Tabs>
            </>
          ) : (
            <Card className="border-dashed py-20 text-center">
              <Clock className="mx-auto size-8 text-muted-foreground" />
              <h3 className="mt-3 text-sm font-semibold">
                One platform per generation
              </h3>
              <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
                Select LinkedIn, Instagram Reels, or X. The result will contain
                only that organic platform asset—never a hidden multi-channel
                bundle or paid Meta ad.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
