"use client";

import { useState, useTransition } from "react";
import { Mail, Loader2, Sparkles, History, Lock, Globe, Clock, Copy, Check, Send, Layers } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { MarkdownContent } from "@/components/markdown-content";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  generateEmailCampaignAction,
  listEmailCampaignsHistoryAction,
  type EmailCampaignResult,
  type EmailStep,
  type EmailCampaignHistoryItem,
} from "@/features/ai/actions/ai-email-campaigns.actions";
import { EDTECH_PROJECTS } from "@/lib/constants";
import { formatDate, getProjectBadgeLabel } from "@/lib/format";

function EmailCard({ email }: { email: EmailStep }) {
  const [copiedSubject, setCopiedSubject] = useState(false);
  const [copiedBody, setCopiedBody] = useState(false);

  const handleCopySubject = () => {
    navigator.clipboard.writeText(`Subject A: ${email.subjectA}\nSubject B: ${email.subjectB}`);
    setCopiedSubject(true);
    toast.success("Subject lines copied!");
    setTimeout(() => setCopiedSubject(false), 2000);
  };

  const handleCopyBody = () => {
    navigator.clipboard.writeText(email.body);
    setCopiedBody(true);
    toast.success("Email body copied!");
    setTimeout(() => setCopiedBody(false), 2000);
  };

  return (
    <Card className="border border-border/70 shadow-sm overflow-hidden transition-all hover:shadow-md bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/40 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="default" className="text-[10px] bg-primary text-primary-foreground font-bold">
            Email #{email.stepNumber}
          </Badge>
          <Badge variant="outline" className="text-[10px] border-primary/30 text-primary bg-primary/5">
            ⏱️ {email.sendDelay}
          </Badge>
          <span className="text-xs font-medium text-foreground/80">
            {email.purpose}
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={handleCopySubject} className="h-6 text-[11px] gap-1 px-2">
          {copiedSubject ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
          {copiedSubject ? "Copied Subjects" : "Copy Subjects"}
        </Button>
      </div>

      <CardContent className="p-4 space-y-3">
        {/* Subject Lines A/B */}
        <div className="space-y-1.5 bg-muted/20 p-3 rounded-lg border border-border/40">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">A/B Subject Lines</span>
          </div>
          <div className="space-y-1 text-xs font-medium">
            <p className="flex items-center gap-1.5"><span className="text-primary font-bold">🅰️</span> {email.subjectA}</p>
            <p className="flex items-center gap-1.5 text-muted-foreground"><span className="text-purple-600 font-bold">🅱️</span> {email.subjectB}</p>
          </div>
          <p className="text-[11px] text-muted-foreground pt-1 border-t border-border/40 italic">
            <strong>Preview Text:</strong> {email.previewText}
          </p>
        </div>

        {/* Body Copy */}
        <div className="space-y-1.5 bg-card p-3 rounded-lg border border-border/50">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Email Body Copy</span>
            <Button variant="ghost" size="sm" onClick={handleCopyBody} className="h-6 text-[11px] gap-1 px-2">
              {copiedBody ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
              {copiedBody ? "Copied Body" : "Copy Body"}
            </Button>
          </div>
          <MarkdownContent content={email.body} density="compact" />
        </div>

        {/* CTA Button Preview */}
        <div className="flex flex-col items-stretch justify-between gap-2 rounded-lg border border-primary/20 bg-primary/5 p-2.5 pt-1 sm:flex-row sm:items-center">
          <span className="text-[11px] font-semibold text-muted-foreground">Primary Call to Action:</span>
          <Button className="h-8 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground pointer-events-none">
            {email.ctaText} →
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function AiEmailCampaignsView() {
  const queryClient = useQueryClient();
  const [campaignGoal, setCampaignGoal] = useState("Product Trial Onboarding Drip");
  const [targetAudience, setTargetAudience] = useState("Product Managers and Engineering Leads");
  const [targetProductKey, setTargetProductKey] = useState("demo-saas");
  const [visibility, setVisibility] = useState<"PRIVATE" | "PUBLIC">("PRIVATE");
  const [result, setResult] = useState<EmailCampaignResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const { data: history = [] } = useQuery({
    queryKey: ["ai-email-campaigns-history"],
    queryFn: async () => {
      const res = await listEmailCampaignsHistoryAction();
      return res.ok ? res.data : [];
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  function onGenerate() {
    startTransition(async () => {
      const res = await generateEmailCampaignAction(campaignGoal, targetAudience, targetProductKey, visibility);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      if (res.data) setResult(res.data);
      queryClient.invalidateQueries({ queryKey: ["ai-email-campaigns-history"] });
      toast.success("Automated Email Drip Sequence generated & saved!");
    });
  }

  function loadFromHistory(item: EmailCampaignHistoryItem) {
    setResult(item.data);
    setCampaignGoal(item.data.campaignGoal);
    setTargetAudience(item.data.targetAudience);
    setTargetProductKey(item.data.projectName);
    setIsSheetOpen(false);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-start gap-2 text-xl font-semibold tracking-tight sm:items-center sm:text-2xl">
            <Mail className="size-6 text-primary" />
            AI Email Drip Generator
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Generate one email-only, 4-step lifecycle sequence with distinct
            purposes, A/B subjects, timing, bodies, and CTA buttons.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* Input Form */}
        <Card className="lg:col-span-5 border-border/80 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Send className="size-4 text-primary" />
                Email Sequence Setup
              </CardTitle>
              <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 border-border/80">
                    <History className="size-3.5 text-primary" />
                    History ({history.length})
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-[380px] sm:w-[480px] overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle className="text-base flex items-center gap-2">
                      <Clock className="size-4 text-primary" />
                      Saved Email Sequences
                    </SheetTitle>
                    <SheetDescription className="text-xs">
                      View previously generated email nurture drip sequences.
                    </SheetDescription>
                  </SheetHeader>
                  <div className="mt-4 space-y-2.5">
                    {history.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic py-6 text-center">
                        No saved sequences found. Run a generation to save automatically.
                      </p>
                    ) : (
                      history.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => loadFromHistory(item)}
                          className="flex flex-col gap-1.5 p-3 rounded-lg border bg-card hover:bg-primary/5 hover:border-primary/40 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-xs text-foreground line-clamp-1">{item.title}</span>
                            <Badge variant={item.visibility === "PUBLIC" ? "default" : "secondary"} className="text-[10px] h-4 px-1.5">
                              {item.visibility === "PUBLIC" ? "Public" : "Private"}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground gap-2 flex-wrap">
                            <span className="font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded text-[10px]">
                              {getProjectBadgeLabel(item)}
                            </span>
                            <span>{formatDate(item.createdAt)}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
            <CardDescription className="text-xs">
              Select product context and campaign goal to construct an automated email funnel.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Target Product Context</label>
              <Select value={targetProductKey} onValueChange={setTargetProductKey} disabled={isPending}>
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
              <label className="text-xs font-semibold text-foreground">Campaign Drip Goal</label>
              <Select value={campaignGoal} onValueChange={setCampaignGoal} disabled={isPending}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Exam Countdown Urgency Nurture" className="text-xs">⏳ Exam Urgency Nurture</SelectItem>
                  <SelectItem value="Welcome & Free Trial Onboarding" className="text-xs">👋 Welcome & Onboarding</SelectItem>
                  <SelectItem value="Free Trial Expiry & Conversion" className="text-xs">🚨 Trial Expiry Conversion</SelectItem>
                  <SelectItem value="Parent Re-engagement & Win-Back" className="text-xs">🔄 Parent Win-Back Drip</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Target Audience Description</label>
              <Input
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="e.g. Parents of IGCSE Year 10-11 students preparing for mocks"
                className="h-9 text-xs"
                disabled={isPending}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Visibility</label>
              <Select value={visibility} onValueChange={(v: "PRIVATE" | "PUBLIC") => setVisibility(v)} disabled={isPending}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRIVATE" className="text-xs">🔒 Private (Default)</SelectItem>
                  <SelectItem value="PUBLIC" className="text-xs">🌐 Public (Workspace)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={onGenerate}
              disabled={isPending || !campaignGoal.trim()}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-9 text-xs"
            >
              {isPending ? (
                <>
                  <Loader2 className="size-3.5 animate-spin mr-2" />
                  Generating 4-Step Email Sequence...
                </>
              ) : (
                <>
                  <Mail className="size-3.5 mr-2" />
                  Generate Automated Email Drip
                </>
              )}
            </Button>
          </CardContent>

          {/* Quick History Bar */}
          {history.length > 0 && (
            <div className="p-3 border-t bg-muted/20 rounded-b-xl space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                  <Clock className="size-3 text-primary" /> Saved Sequences
                </span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {history.slice(0, 3).map((h) => (
                  <button
                    key={h.id}
                    onClick={() => loadFromHistory(h)}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] rounded-md border bg-card hover:bg-primary/10 hover:border-primary/40 transition-colors shrink-0 max-w-[220px]"
                  >
                    <span className="font-semibold text-primary text-[10px] shrink-0">{getProjectBadgeLabel(h)}</span>
                    <span className="truncate text-foreground/80">{h.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Output Panel */}
        <div className="lg:col-span-7 space-y-4">
          {isPending && (
            <Card className="py-20 text-center border-border/80 shadow-sm">
              <div className="flex flex-col items-center justify-center space-y-3">
                <Loader2 className="size-8 animate-spin text-primary" />
                <p className="text-sm font-medium text-foreground">
                  DeepSeek AI is writing a 4-step email sequence with A/B subject lines…
                </p>
                <p className="text-xs text-muted-foreground">Grounded with product knowledge & saving to vault</p>
              </div>
            </Card>
          )}

          {!result && !isPending && (
            <Card className="py-20 text-center border-dashed border-border/80 shadow-sm">
              <div className="flex flex-col items-center justify-center space-y-3 text-muted-foreground p-6">
                <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Layers className="size-6" />
                </div>
                <div className="space-y-1 max-w-sm">
                  <h3 className="font-semibold text-sm text-foreground">AI Email Drip Funnel</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Click &quot;Generate Automated Email Drip&quot; to build a 4-step email sequence with A/B subjects, preheaders, and CTA buttons ready for Mailchimp, Klaviyo, or HubSpot.
                  </p>
                </div>
              </div>
            </Card>
          )}

          {result && !isPending && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <Badge variant="outline" className="text-xs border-primary/30 text-primary font-semibold">
                  ✉️ {result.campaignName}
                </Badge>
                <span className="text-xs text-muted-foreground">4 Automated Emails Ready</span>
              </div>

              <div className="space-y-4">
                {result.emails.map((email) => (
                  <EmailCard key={email.stepNumber} email={email} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
