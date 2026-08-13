"use client";

import { useState, useTransition } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  ClipboardCheck,
  Clock,
  Copy,
  Globe,
  History,
  Lightbulb,
  Loader2,
  Lock,
  Zap,
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
import { Progress } from "@/components/ui/progress";
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
  listStrategyOptimizerHistoryAction,
  optimizeStrategyAction,
  type OptimizerHistoryItem,
  type StrategyOptimizerResult,
} from "@/features/ai/actions/ai-optimizer.actions";
import { EDTECH_PROJECTS } from "@/lib/constants";
import { formatDate, getProjectBadgeLabel } from "@/lib/format";

function DiagnosticPanel({ content }: { content: string }) {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-5">
        <MarkdownContent content={content} density="compact" />
      </CardContent>
    </Card>
  );
}

export function AiOptimizerView() {
  const queryClient = useQueryClient();
  const [draftCopy, setDraftCopy] = useState(
    "Try our AI-powered cloud workflow suite today! Centralize task management, automate team handoffs, and track velocity seamlessly.",
  );
  const [targetProductKey, setTargetProductKey] = useState("demo-saas");
  const [visibility, setVisibility] = useState<"PRIVATE" | "PUBLIC">("PRIVATE");
  const [result, setResult] = useState<StrategyOptimizerResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: history = [] } = useQuery({
    queryKey: ["ai-optimizer-history"],
    queryFn: async () => {
      const response = await listStrategyOptimizerHistoryAction();
      return response.ok ? response.data : [];
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  function onDiagnose() {
    startTransition(async () => {
      const response = await optimizeStrategyAction(
        draftCopy,
        visibility,
        targetProductKey,
      );
      if (!response.ok) {
        toast.error(response.error);
        return;
      }
      setResult(response.data);
      queryClient.invalidateQueries({ queryKey: ["ai-optimizer-history"] });
      toast.success("Draft diagnosis completed and saved.");
    });
  }

  function loadFromHistory(item: OptimizerHistoryItem) {
    setResult(item.data);
    setDraftCopy(item.draftCopy);
    setIsSheetOpen(false);
    toast.info(`Loaded diagnosis: ${item.title}`);
  }

  function copyReport() {
    if (!result) return;
    navigator.clipboard.writeText(result.rawMarkdown);
    setCopied(true);
    toast.success("Diagnostic report copied.");
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
                  <Zap className="size-5 text-primary" />
                  Existing Draft Diagnostic
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
                        Saved Draft Diagnostics
                      </SheetTitle>
                      <SheetDescription className="text-xs">
                        Review earlier scorecards, fixes, and edit recommendations.
                      </SheetDescription>
                    </SheetHeader>
                    <div className="mt-4 space-y-2.5">
                      {history.length === 0 ? (
                        <p className="py-6 text-center text-xs italic text-muted-foreground">
                          No saved draft diagnostics yet.
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
                            <p className="line-clamp-2 rounded bg-muted/40 p-1.5 font-mono text-[11px] italic text-muted-foreground">
                              &quot;{item.draftCopy}&quot;
                            </p>
                            <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-muted-foreground">
                              <span className="font-medium text-primary">
                                {getProjectBadgeLabel(item)}
                              </span>
                              <span className="font-bold text-primary">
                                {item.data.score}/100
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
                Diagnose one supplied draft against a consistent rubric. This page
                explains what is weak and how to fix it; it does not generate a new
                campaign or channel package.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Project / Product Context</label>
                <Select
                  value={targetProductKey}
                  onValueChange={setTargetProductKey}
                  disabled={isPending}
                >
                  <SelectTrigger className="h-9 w-full text-xs">
                    <SelectValue placeholder="Select an EdTech project" />
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
                <label className="text-xs font-semibold">Draft to Diagnose</label>
                <Textarea
                  rows={8}
                  value={draftCopy}
                  onChange={(event) => setDraftCopy(event.target.value)}
                  placeholder="Paste the exact marketing draft you want diagnosed…"
                  disabled={isPending}
                  className="resize-none font-mono text-xs"
                />
                <p className="text-[11px] text-muted-foreground">
                  The diagnostic stays within this draft and product context.
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
                onClick={onDiagnose}
                disabled={isPending || !draftCopy.trim()}
                className="h-10 w-full text-xs font-semibold"
              >
                {isPending ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <ClipboardCheck className="mr-2 size-4" />
                )}
                Diagnose This Draft
              </Button>
            </CardContent>
          </div>

          {history.length > 0 && (
            <div className="space-y-2 rounded-b-xl border-t bg-muted/20 p-3">
              <span className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                <Clock className="size-3 text-primary" /> Recent Diagnostics
              </span>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {history.slice(0, 3).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => loadFromHistory(item)}
                    className="flex max-w-[220px] shrink-0 items-center gap-1.5 rounded-md border bg-card px-2.5 py-1 text-[11px] transition-colors hover:border-primary/40 hover:bg-primary/10"
                  >
                    <span className="font-bold text-primary">{item.data.score}pt</span>
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
                  Scoring the supplied draft and locating concrete weaknesses…
                </p>
                <p className="text-xs text-muted-foreground">
                  Producing fixes and line edits—not replacement campaign assets.
                </p>
              </CardContent>
            </Card>
          )}

          {!result && !isPending && (
            <Card className="border-dashed py-20 text-center shadow-sm">
              <CardContent className="flex flex-col items-center gap-3">
                <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Lightbulb className="size-6" />
                </div>
                <div className="max-w-sm space-y-1">
                  <h3 className="text-sm font-semibold">Know exactly what to fix</h3>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Receive a transparent diagnosis, prioritized corrections, precise
                    line edits, and a focused validation plan for the draft you provide.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {result && !isPending && (
            <div className="space-y-4">
              <Card className="border-primary/20 bg-gradient-to-r from-primary/10 via-card to-card shadow-sm">
                <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground">
                      Draft Health Score
                    </p>
                    <div className="flex flex-wrap items-baseline gap-2.5">
                      <span
                        className={`text-3xl font-extrabold ${
                          result.score >= 80
                            ? "text-emerald-600"
                            : result.score >= 50
                              ? "text-primary"
                              : "text-amber-600"
                        }`}
                      >
                        {result.score}/100
                      </span>
                      <Badge variant="outline" className="text-[11px]">
                        {result.score >= 80
                          ? "Strong draft"
                          : result.score >= 50
                            ? "Material fixes recommended"
                            : "Major revision required"}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex w-full items-center gap-3 sm:w-auto">
                    <div className="w-full space-y-1 sm:w-36">
                      <Progress value={result.score} className="h-2.5" />
                      <p className="text-right font-mono text-[10px] text-muted-foreground">
                        Rubric score
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyReport}
                      className="h-8 shrink-0 gap-1.5 text-xs"
                    >
                      {copied ? (
                        <Check className="size-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="size-3.5" />
                      )}
                      {copied ? "Copied" : "Copy Report"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Tabs defaultValue="diagnosis">
                <TabsList className="flex w-full gap-1 overflow-x-auto p-1 sm:grid sm:grid-cols-4">
                  <TabsTrigger value="diagnosis" className="text-xs">
                    🩺 Diagnosis
                  </TabsTrigger>
                  <TabsTrigger value="fixes" className="text-xs">
                    🎯 Priority Fixes
                  </TabsTrigger>
                  <TabsTrigger value="edits" className="text-xs">
                    ✏️ Line Edits
                  </TabsTrigger>
                  <TabsTrigger value="test" className="text-xs">
                    🧪 Test Plan
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="diagnosis" className="mt-4">
                  <DiagnosticPanel content={result.diagnosis} />
                </TabsContent>
                <TabsContent value="fixes" className="mt-4">
                  <DiagnosticPanel content={result.priorityFixes} />
                </TabsContent>
                <TabsContent value="edits" className="mt-4">
                  <DiagnosticPanel content={result.lineEdits} />
                </TabsContent>
                <TabsContent value="test" className="mt-4">
                  <DiagnosticPanel content={result.testPlan} />
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
