"use client";

import { useState, useTransition } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BrainCircuit,
  Check,
  Clock,
  Copy,
  Globe,
  History,
  Loader2,
  Lock,
  SearchCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

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
  listEdTechResearchHistoryAction,
  runEdTechResearchAction,
  type EdTechResearchResult,
  type ResearchHistoryItem,
} from "@/features/ai/actions/ai-research.actions";
import { EDTECH_PROJECTS } from "@/lib/constants";
import { formatDate, getProjectBadgeLabel } from "@/lib/format";

function ResearchPanel({ content }: { content: string }) {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-5">
        <MarkdownContent content={content} density="compact" />
      </CardContent>
    </Card>
  );
}

export function AiResearchView() {
  const queryClient = useQueryClient();
  const [selectedProject, setSelectedProject] = useState("demo-saas");
  const [visibility, setVisibility] = useState<"PRIVATE" | "PUBLIC">("PRIVATE");
  const [result, setResult] = useState<EdTechResearchResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const { data: history = [] } = useQuery({
    queryKey: ["ai-research-history"],
    queryFn: async () => {
      const response = await listEdTechResearchHistoryAction();
      return response.ok ? response.data : [];
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  function onRunResearch() {
    startTransition(async () => {
      const response = await runEdTechResearchAction(selectedProject, visibility);
      if (!response.ok) {
        toast.error(response.error);
        return;
      }
      setResult(response.data);
      queryClient.invalidateQueries({ queryKey: ["ai-research-history"] });
      toast.success("Evidence brief generated and saved.");
    });
  }

  function loadFromHistory(item: ResearchHistoryItem) {
    setResult(item.data);
    setSelectedProject(item.data.projectName);
    setIsSheetOpen(false);
    toast.info(`Loaded evidence brief: ${item.title}`);
  }

  function copyReport() {
    if (!result) return;
    navigator.clipboard.writeText(result.rawMarkdown);
    setCopied(true);
    toast.success("Evidence brief copied.");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-gradient-to-r from-card via-card to-primary/5 shadow-sm">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-base">
                <BrainCircuit className="size-5 text-primary" />
                Audience &amp; Market Evidence
              </CardTitle>
              <CardDescription className="max-w-2xl text-xs">
                Build an evidence-led intelligence brief. This page identifies market
                conditions, audience needs, demand signals, and knowledge gaps—it does
                not create campaign copy.
              </CardDescription>
            </div>

            <div className="flex w-full flex-col gap-2 min-[420px]:w-auto min-[420px]:flex-row min-[420px]:flex-wrap">
              <Select
                value={visibility}
                onValueChange={(value: "PRIVATE" | "PUBLIC") => setVisibility(value)}
                disabled={isPending}
              >
                <SelectTrigger className="h-9 w-full text-xs min-[420px]:w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRIVATE" className="text-xs">
                    <span className="flex items-center gap-1.5">
                      <Lock className="size-3 text-amber-500" /> Private
                    </span>
                  </SelectItem>
                  <SelectItem value="PUBLIC" className="text-xs">
                    <span className="flex items-center gap-1.5">
                      <Globe className="size-3 text-emerald-500" /> Public (Team)
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={selectedProject}
                onValueChange={setSelectedProject}
                disabled={isPending}
              >
                <SelectTrigger className="h-9 w-full text-xs min-[420px]:w-[190px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EDTECH_PROJECTS.map((project) => (
                    <SelectItem key={project.id} value={project.id} className="text-xs">
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                onClick={onRunResearch}
                disabled={isPending}
                className="h-9 w-full text-xs font-semibold min-[420px]:w-auto"
              >
                {isPending ? (
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                ) : (
                  <Sparkles className="mr-1.5 size-3.5" />
                )}
                Build Evidence Brief
              </Button>

              <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 w-full gap-1.5 text-xs min-[420px]:w-auto"
                  >
                    <History className="size-3.5 text-primary" />
                    History ({history.length})
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-[380px] overflow-y-auto sm:w-[480px]">
                  <SheetHeader>
                    <SheetTitle className="flex items-center gap-2 text-base">
                      <Clock className="size-4 text-primary" />
                      Saved Evidence Briefs
                    </SheetTitle>
                    <SheetDescription className="text-xs">
                      Reopen earlier evidence-based market and audience reports.
                    </SheetDescription>
                  </SheetHeader>
                  <div className="mt-4 space-y-2.5">
                    {history.length === 0 ? (
                      <p className="py-6 text-center text-xs italic text-muted-foreground">
                        No saved evidence briefs yet.
                      </p>
                    ) : (
                      history.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => loadFromHistory(item)}
                          className="flex w-full flex-col gap-1.5 rounded-lg border bg-card p-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="line-clamp-1 text-xs font-medium">
                              {item.title}
                            </span>
                            <Badge
                              variant={item.visibility === "PUBLIC" ? "default" : "secondary"}
                              className="h-4 px-1.5 text-[10px]"
                            >
                              {item.visibility === "PUBLIC" ? "Public" : "Private"}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-muted-foreground">
                            <span className="font-medium text-primary">
                              {getProjectBadgeLabel(item)}
                            </span>
                            <span>{formatDate(item.createdAt)}</span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </CardHeader>
      </Card>

      {isPending && (
        <Card className="py-14 text-center">
          <CardContent className="flex flex-col items-center gap-3">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-sm font-medium">
              Synthesizing market evidence and identifying unsupported assumptions…
            </p>
            <p className="text-xs text-muted-foreground">
              No campaign copy or competitor sales scripts will be generated.
            </p>
          </CardContent>
        </Card>
      )}

      {!result && !isPending && (
        <Card className="border-dashed py-16 text-center">
          <CardContent className="flex flex-col items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <SearchCheck className="size-6" />
            </div>
            <div className="max-w-md space-y-1">
              <h3 className="text-sm font-semibold">Evidence before execution</h3>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Use this report to understand the market and audience. Take the findings
                to another specialist only when you are ready to create or optimize an asset.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {result && !isPending && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">
                Evidence Brief — <span className="text-primary">{result.projectName}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Observations, signals, and explicit evidence gaps
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={copyReport}
              className="h-8 gap-1.5 text-xs"
            >
              {copied ? (
                <Check className="size-3.5 text-emerald-600" />
              ) : (
                <Copy className="size-3.5" />
              )}
              {copied ? "Copied" : "Copy Evidence Brief"}
            </Button>
          </div>

          <Tabs defaultValue="landscape">
            <TabsList className="flex w-full gap-1 overflow-x-auto p-1 sm:grid sm:grid-cols-4">
              <TabsTrigger value="landscape" className="text-xs">
                🌐 Market Landscape
              </TabsTrigger>
              <TabsTrigger value="audience" className="text-xs">
                👥 Audience Insights
              </TabsTrigger>
              <TabsTrigger value="demand" className="text-xs">
                📈 Demand Signals
              </TabsTrigger>
              <TabsTrigger value="gaps" className="text-xs">
                🔎 Evidence Gaps
              </TabsTrigger>
            </TabsList>
            <TabsContent value="landscape" className="mt-4">
              <ResearchPanel content={result.marketLandscape} />
            </TabsContent>
            <TabsContent value="audience" className="mt-4">
              <ResearchPanel content={result.audienceInsights} />
            </TabsContent>
            <TabsContent value="demand" className="mt-4">
              <ResearchPanel content={result.demandSignals} />
            </TabsContent>
            <TabsContent value="gaps" className="mt-4">
              <ResearchPanel content={result.evidenceGaps} />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
