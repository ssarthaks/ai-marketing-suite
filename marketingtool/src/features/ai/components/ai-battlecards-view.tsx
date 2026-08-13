"use client";

import { useState, useTransition } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Clock,
  Copy,
  Globe,
  History,
  Loader2,
  Lock,
  ShieldQuestion,
  Swords,
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
  generateBattlecardsAction,
  listBattlecardsHistoryAction,
  type BattlecardResult,
  type BattlecardsHistoryItem,
} from "@/features/ai/actions/ai-battlecards.actions";
import { EDTECH_PROJECTS } from "@/lib/constants";
import { formatDate, getProjectBadgeLabel } from "@/lib/format";

function BattlecardPanel({ content }: { content: string }) {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-5">
        <MarkdownContent content={content} density="compact" />
      </CardContent>
    </Card>
  );
}

export function AiBattlecardsView() {
  const queryClient = useQueryClient();
  const [competitorName, setCompetitorName] = useState("Legacy Competitor X");
  const [targetProductKey, setTargetProductKey] = useState("demo-saas");
  const [visibility, setVisibility] = useState<"PRIVATE" | "PUBLIC">("PRIVATE");
  const [result, setResult] = useState<BattlecardResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: history = [] } = useQuery({
    queryKey: ["ai-battlecards-history"],
    queryFn: async () => {
      const response = await listBattlecardsHistoryAction();
      return response.ok ? response.data : [];
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  function onGenerate() {
    startTransition(async () => {
      const response = await generateBattlecardsAction(
        competitorName,
        targetProductKey,
        visibility,
      );
      if (!response.ok) {
        toast.error(response.error);
        return;
      }
      setResult(response.data);
      queryClient.invalidateQueries({ queryKey: ["ai-battlecards-history"] });
      toast.success("Competitor sales battlecard generated and saved.");
    });
  }

  function loadFromHistory(item: BattlecardsHistoryItem) {
    setResult(item.data);
    setCompetitorName(item.competitorName);
    setTargetProductKey(item.data.projectName);
    setIsSheetOpen(false);
    toast.info(`Loaded battlecard: ${item.title}`);
  }

  function copyBattlecard() {
    if (!result) return;
    navigator.clipboard.writeText(result.rawMarkdown);
    setCopied(true);
    toast.success("Sales battlecard copied.");
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
                  <Swords className="size-5 text-primary" />
                  Named Competitor Sales Battlecard
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
                        Saved Sales Battlecards
                      </SheetTitle>
                      <SheetDescription className="text-xs">
                        Reopen competitive enablement briefs for sales conversations.
                      </SheetDescription>
                    </SheetHeader>
                    <div className="mt-4 space-y-2.5">
                      {history.length === 0 ? (
                        <p className="py-6 text-center text-xs italic text-muted-foreground">
                          No saved sales battlecards yet.
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
                            <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-muted-foreground">
                              <span className="font-medium text-primary">
                                {getProjectBadgeLabel(item)}
                              </span>
                              <span>vs {item.competitorName}</span>
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
                Equip sales teams for a specific competitive conversation. This page
                produces comparison evidence, buyer decision criteria, objection
                responses, and discovery questions—not ads or general market research.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Your Product</label>
                <Select
                  value={targetProductKey}
                  onValueChange={setTargetProductKey}
                  disabled={isPending}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select target product" />
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
                  Competitor / Alternative
                </label>
                <Input
                  placeholder="e.g. Quizlet, Coursera, or traditional private tutoring"
                  value={competitorName}
                  onChange={(event) => setCompetitorName(event.target.value)}
                  disabled={isPending}
                  className="h-9 text-xs"
                />
                <p className="text-[11px] text-muted-foreground">
                  Name one competitor or alternative so the output stays decision-specific.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Visibility</label>
                <Select
                  value={visibility}
                  onValueChange={(value: "PRIVATE" | "PUBLIC") => setVisibility(value)}
                  disabled={isPending}
                >
                  <SelectTrigger className="h-9 text-xs">
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

              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-muted-foreground">
                  Quick alternatives
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "Traditional 1:1 Tutors",
                    "Static Textbooks",
                    "Private Tuition Centers",
                  ].map((preset) => (
                    <Button
                      key={preset}
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setCompetitorName(preset)}
                      disabled={isPending}
                      className="h-6 px-2 text-[10px]"
                    >
                      {preset}
                    </Button>
                  ))}
                </div>
              </div>

              <Button
                onClick={onGenerate}
                disabled={isPending || !competitorName.trim()}
                className="h-10 w-full text-xs font-semibold"
              >
                {isPending ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Swords className="mr-2 size-4" />
                )}
                Generate Sales Battlecard
              </Button>
            </CardContent>
          </div>

          {history.length > 0 && (
            <div className="space-y-2 rounded-b-xl border-t bg-muted/20 p-3">
              <span className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                <Clock className="size-3 text-primary" /> Recent Battlecards
              </span>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {history.slice(0, 3).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => loadFromHistory(item)}
                    className="flex max-w-[220px] shrink-0 items-center gap-1.5 rounded-md border bg-card px-2.5 py-1 text-[11px] transition-colors hover:border-primary/40 hover:bg-primary/10"
                  >
                    <span className="truncate">vs {item.competitorName}</span>
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
                  Building a decision-specific sales brief for {competitorName}…
                </p>
                <p className="text-xs text-muted-foreground">
                  Organizing comparison points, objections, and discovery questions.
                </p>
              </CardContent>
            </Card>
          )}

          {!result && !isPending && (
            <Card className="border-dashed py-20 text-center shadow-sm">
              <CardContent className="flex flex-col items-center gap-3">
                <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <ShieldQuestion className="size-6" />
                </div>
                <div className="max-w-sm space-y-1">
                  <h3 className="text-sm font-semibold">Prepare for the sales conversation</h3>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Enter one named competitor to generate a focused enablement asset for
                    qualification, differentiation, and objection handling.
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
                    Sales Battlecard: {result.projectName} vs {competitorName}
                  </Badge>
                  <p className="mt-1 text-xs text-muted-foreground">
                    For internal sales enablement—not public campaign copy
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyBattlecard}
                  className="h-8 gap-1.5 text-xs"
                >
                  {copied ? (
                    <Check className="size-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                  {copied ? "Copied" : "Copy Battlecard"}
                </Button>
              </div>

              <Tabs defaultValue="comparison">
                <TabsList className="flex w-full gap-1 overflow-x-auto p-1 sm:grid sm:grid-cols-4">
                  <TabsTrigger value="comparison" className="text-xs">
                    ⚔️ Comparison
                  </TabsTrigger>
                  <TabsTrigger value="criteria" className="text-xs">
                    ⚖️ Decision Criteria
                  </TabsTrigger>
                  <TabsTrigger value="objections" className="text-xs">
                    🛡️ Objection Handling
                  </TabsTrigger>
                  <TabsTrigger value="discovery" className="text-xs">
                    🔍 Discovery Questions
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="comparison" className="mt-4">
                  <BattlecardPanel content={result.comparisonMatrix} />
                </TabsContent>
                <TabsContent value="criteria" className="mt-4">
                  <BattlecardPanel content={result.decisionCriteria} />
                </TabsContent>
                <TabsContent value="objections" className="mt-4">
                  <BattlecardPanel content={result.objectionHandlers} />
                </TabsContent>
                <TabsContent value="discovery" className="mt-4">
                  <BattlecardPanel content={result.discoveryQuestions} />
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
