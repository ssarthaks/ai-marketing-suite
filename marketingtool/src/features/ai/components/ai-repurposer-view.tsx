"use client";

import { useState, useTransition } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Blocks,
  Check,
  Clock,
  Copy,
  FileStack,
  Globe,
  History,
  Loader2,
  Lock,
  Repeat,
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
import { Textarea } from "@/components/ui/textarea";
import {
  listRepurposerHistoryAction,
  repurposeContentAction,
  type ContentRepurposeResult,
  type RepurposerHistoryItem,
} from "@/features/ai/actions/ai-repurposer.actions";
import { EDTECH_PROJECTS } from "@/lib/constants";
import { formatDate, getProjectBadgeLabel } from "@/lib/format";

function BlueprintPanel({ content }: { content: string }) {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-5">
        <MarkdownContent content={content} density="compact" />
      </CardContent>
    </Card>
  );
}

export function AiRepurposerView() {
  const queryClient = useQueryClient();
  const [sourceText, setSourceText] = useState(
    "We are launching our new AI-powered workflow automation suite! Features real-time task management, seamless Webhook triggers, and automated sprint reporting.",
  );
  const [targetProductKey, setTargetProductKey] = useState("demo-saas");
  const [visibility, setVisibility] = useState<"PRIVATE" | "PUBLIC">("PRIVATE");
  const [result, setResult] = useState<ContentRepurposeResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: history = [] } = useQuery({
    queryKey: ["ai-repurposer-history"],
    queryFn: async () => {
      const response = await listRepurposerHistoryAction();
      return response.ok ? response.data : [];
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  function onBuildBlueprint() {
    startTransition(async () => {
      const response = await repurposeContentAction(
        sourceText,
        visibility,
        targetProductKey,
      );
      if (!response.ok) {
        toast.error(response.error);
        return;
      }
      setResult(response.data);
      queryClient.invalidateQueries({ queryKey: ["ai-repurposer-history"] });
      toast.success("Repurposing blueprint generated and saved.");
    });
  }

  function loadFromHistory(item: RepurposerHistoryItem) {
    setResult(item.data);
    setSourceText(item.sourceText);
    setTargetProductKey(item.data.projectName);
    setIsSheetOpen(false);
    toast.info(`Loaded repurposing blueprint: ${item.title}`);
  }

  function copyBlueprint() {
    if (!result) return;
    navigator.clipboard.writeText(result.rawMarkdown);
    setCopied(true);
    toast.success("Repurposing blueprint copied.");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      <div className="grid items-start gap-6 lg:grid-cols-12">
        <Card className="flex flex-col justify-between border-border/80 shadow-sm lg:col-span-5">
          <div>
            <CardHeader className="pb-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Repeat className="size-5 text-primary" />
                  Source Content Atomizer
                </CardTitle>
                <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                  <SheetTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 text-xs"
                    >
                      <History className="size-3.5 text-primary" />
                      History ({history.length})
                    </Button>
                  </SheetTrigger>
                  <SheetContent className="w-[380px] overflow-y-auto sm:w-[480px]">
                    <SheetHeader>
                      <SheetTitle className="flex items-center gap-2 text-base">
                        <Clock className="size-4 text-primary" />
                        Saved Repurposing Blueprints
                      </SheetTitle>
                      <SheetDescription className="text-xs">
                        Reopen source analyses, reusable atoms, and derivative plans.
                      </SheetDescription>
                    </SheetHeader>
                    <div className="mt-4 space-y-2.5">
                      {history.length === 0 ? (
                        <p className="py-6 text-center text-xs italic text-muted-foreground">
                          No saved repurposing blueprints yet.
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
                                variant={
                                  item.visibility === "PUBLIC" ? "default" : "secondary"
                                }
                                className="h-4 px-1.5 text-[10px]"
                              >
                                {item.visibility === "PUBLIC" ? "Public" : "Private"}
                              </Badge>
                            </div>
                            <p className="line-clamp-2 rounded bg-muted/40 p-1.5 text-[11px] text-muted-foreground">
                              {item.sourceText}
                            </p>
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
              <CardDescription className="text-xs">
                Break one existing source into a reusable narrative system. This page
                produces planning briefs and traceable content atoms—not finished
                emails, social posts, Reels, or ads.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Target Product Context</label>
                <Select
                  value={targetProductKey}
                  onValueChange={setTargetProductKey}
                  disabled={isPending}
                >
                  <SelectTrigger className="h-9 w-full text-xs">
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
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">
                  Existing Source Content
                </label>
                <Textarea
                  value={sourceText}
                  onChange={(event) => setSourceText(event.target.value)}
                  placeholder="Paste a complete source article, announcement, interview, or campaign brief…"
                  rows={9}
                  disabled={isPending}
                  className="resize-none text-xs"
                />
                <p className="text-[11px] text-muted-foreground">
                  Longer, factual source material creates more useful and traceable atoms.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Visibility</label>
                <Select
                  value={visibility}
                  onValueChange={(value: "PRIVATE" | "PUBLIC") => setVisibility(value)}
                  disabled={isPending}
                >
                  <SelectTrigger className="h-9 w-full text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PRIVATE" className="text-xs">
                      <span className="flex items-center gap-1.5">
                        <Lock className="size-3 text-amber-500" /> Private (Default)
                      </span>
                    </SelectItem>
                    <SelectItem value="PUBLIC" className="text-xs">
                      <span className="flex items-center gap-1.5">
                        <Globe className="size-3 text-emerald-500" /> Public (Team)
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={onBuildBlueprint}
                disabled={isPending || !sourceText.trim()}
                className="h-10 w-full text-xs font-semibold"
              >
                {isPending ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Blocks className="mr-2 size-4" />
                )}
                Build Repurposing Blueprint
              </Button>
            </CardContent>
          </div>

          {history.length > 0 && (
            <div className="space-y-2 rounded-b-xl border-t bg-muted/20 p-3">
              <span className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                <Clock className="size-3 text-primary" /> Recent Blueprints
              </span>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {history.slice(0, 3).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => loadFromHistory(item)}
                    className="flex max-w-[220px] shrink-0 items-center gap-1.5 rounded-md border bg-card px-2.5 py-1 text-[11px] transition-colors hover:border-primary/40 hover:bg-primary/10"
                  >
                    <span className="truncate">{item.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </Card>

        <div className="space-y-4 lg:col-span-7">
          {isPending && (
            <Card className="py-20 text-center shadow-sm">
              <CardContent className="flex flex-col items-center gap-3">
                <Loader2 className="size-8 animate-spin text-primary" />
                <p className="text-sm font-medium">
                  Extracting the narrative, facts, examples, and reusable content atoms…
                </p>
                <p className="text-xs text-muted-foreground">
                  Building derivative briefs without writing finished channel assets.
                </p>
              </CardContent>
            </Card>
          )}

          {!result && !isPending && (
            <Card className="border-dashed py-20 text-center shadow-sm">
              <CardContent className="flex flex-col items-center gap-3">
                <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <FileStack className="size-6" />
                </div>
                <div className="max-w-sm space-y-1">
                  <h3 className="text-sm font-semibold">One source, reusable building blocks</h3>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Create a source-faithful blueprint that other channel specialists can
                    execute without inventing facts or repeating strategy work.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {result && !isPending && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <Badge variant="outline" className="border-primary/30 text-primary">
                    Repurposing Blueprint Ready
                  </Badge>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Planning system for {result.projectName}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyBlueprint}
                  className="h-8 gap-1.5 text-xs"
                >
                  {copied ? (
                    <Check className="size-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                  {copied ? "Copied" : "Copy Blueprint"}
                </Button>
              </div>

              <Tabs defaultValue="narrative">
                <TabsList className="flex w-full gap-1 overflow-x-auto p-1 sm:grid sm:grid-cols-4">
                  <TabsTrigger value="narrative" className="text-xs">
                    🧭 Core Narrative
                  </TabsTrigger>
                  <TabsTrigger value="atoms" className="text-xs">
                    🧱 Content Atoms
                  </TabsTrigger>
                  <TabsTrigger value="briefs" className="text-xs">
                    📋 Derivative Briefs
                  </TabsTrigger>
                  <TabsTrigger value="plan" className="text-xs">
                    ♻️ Reuse Plan
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="narrative" className="mt-4">
                  <BlueprintPanel content={result.coreNarrative} />
                </TabsContent>
                <TabsContent value="atoms" className="mt-4">
                  <BlueprintPanel content={result.contentAtoms} />
                </TabsContent>
                <TabsContent value="briefs" className="mt-4">
                  <BlueprintPanel content={result.derivativeBriefs} />
                </TabsContent>
                <TabsContent value="plan" className="mt-4">
                  <BlueprintPanel content={result.reusePlan} />
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
