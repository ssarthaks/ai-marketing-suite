import { useEffect, useRef, useState } from "react";
import { Check, Copy, FileCode, Pencil, RefreshCw, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { ChatMessage, ChatAttachment } from "@/lib/threads";
import logo from "@/assets/logo-v2.png";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { MessageResponse } from "@/components/ai-elements/message";
import { InteractiveMcq, type McqQuestion } from "./interactive-mcq";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { z } from "zod";

const mcqQuestionsSchema = z
  .array(
    z
      .object({
        id: z
          .string()
          .min(1)
          .max(80)
          .regex(/^[A-Za-z0-9_-]+$/),
        question: z.string().min(1).max(500),
        options: z
          .array(z.string().min(1).max(200))
          .min(2)
          .max(10)
          .refine(
            (options) => new Set(options).size === options.length,
            "Duplicate options",
          ),
      })
      .strict(),
  )
  .min(1)
  .max(10)
  .refine(
    (questions) =>
      new Set(questions.map((question) => question.id)).size ===
      questions.length,
    "Duplicate question identifiers",
  );

interface Props {
  messages: ChatMessage[];
  status: "idle" | "submitted" | "streaming";
  onRegenerate: () => void;
  onEditUser: (id: string, newContent: string) => void;
  onInteractiveSubmit?: (text: string) => void;
  agentStatus?: string;
}

export function MessageList({
  messages,
  status,
  onRegenerate,
  onEditUser,
  onInteractiveSubmit,
  agentStatus = "Cooking...",
}: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const userScrolledUpRef = useRef(false);
  const prevScrollTop = useRef(0);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const currentScrollTop = el.scrollTop;

    // If the user explicitly scrolls UP, disable auto-scrolling
    if (currentScrollTop < prevScrollTop.current) {
      userScrolledUpRef.current = true;
    }

    // If the user manually scrolls back to the very bottom, re-enable auto-scrolling
    const isAtBottom =
      el.scrollHeight - currentScrollTop - el.clientHeight <= 10;
    if (isAtBottom) {
      userScrolledUpRef.current = false;
    }

    prevScrollTop.current = currentScrollTop;
  };

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    // Always force scroll when a new request is submitted
    if (status === "submitted") {
      userScrolledUpRef.current = false;
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
    // Auto-scroll during streaming only if the user hasn't manually scrolled up
    else if (!userScrolledUpRef.current) {
      el.scrollTo({ top: el.scrollHeight, behavior: "auto" }); // Use "auto" to prevent smooth animation lag from fighting the user
    }
  }, [messages, status]);

  return (
    <div
      ref={scrollerRef}
      onScroll={handleScroll}
      className="h-full w-full overflow-y-auto"
    >
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-8">
        {messages.map((m, i) => {
          const isPending =
            m.role === "assistant" &&
            status === "submitted" &&
            i === messages.length - 1 &&
            !m.content;

          if (isPending) return null;

          return m.role === "user" ? (
            <UserBubble
              key={m.id}
              message={m}
              onEdit={(text) => onEditUser(m.id, text)}
            />
          ) : (
            <AssistantBubble
              key={m.id}
              message={m}
              isLast={i === messages.length - 1}
              streaming={status === "streaming" && i === messages.length - 1}
              onRegenerate={onRegenerate}
              onInteractiveSubmit={onInteractiveSubmit}
            />
          );
        })}
        {status === "submitted" && (
          <div className="flex items-start gap-3">
            <Avatar role="assistant" />
            <div className="pt-1.5">
              <Shimmer>{agentStatus}</Shimmer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Avatar({ role }: { role: "user" | "assistant" }) {
  if (role === "assistant") {
    return (
      <img
        src={logo.src}
        alt="AiAgent"
        width={28}
        height={28}
        className="size-7 shrink-0 rounded-md dark:invert"
        loading="lazy"
      />
    );
  }
  return (
    <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
      <User className="size-4" />
    </div>
  );
}

function UserBubble({
  message,
  onEdit,
}: {
  message: ChatMessage;
  onEdit: (text: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);

  return (
    <div className="group flex flex-col items-end gap-1">
      {editing ? (
        <div className="w-full max-w-[85%] rounded-2xl border border-border bg-card p-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="w-full resize-none bg-transparent text-[15px] focus:outline-none"
            rows={Math.min(8, draft.split("\n").length + 1)}
            autoFocus
          />
          <AttachmentList attachments={message.attachments} align="end" />
          <div className="mt-2 flex justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setDraft(message.content);
                setEditing(false);
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (draft.trim()) {
                  onEdit(draft.trim());
                  setEditing(false);
                }
              }}
            >
              Send
            </Button>
          </div>
        </div>
      ) : (
        <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl bg-primary px-4 py-2.5 text-[15px] leading-6 text-primary-foreground shadow-sm">
          {message.content}
          <AttachmentList attachments={message.attachments} align="end" />
        </div>
      )}
      <div className="flex h-6 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <CopyButton text={message.content} mode="plain" />
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setEditing(true)}
          aria-label="Edit message"
          className="text-muted-foreground"
        >
          <Pencil className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

function AttachmentList({
  attachments,
  align = "start",
}: {
  attachments?: ChatAttachment[];
  align?: "start" | "end";
}) {
  const [previewText, setPreviewText] = useState<{
    name: string;
    content: string;
  } | null>(null);

  if (!attachments || attachments.length === 0) return null;
  return (
    <>
      <div
        className={cn(
          "mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground",
          align === "end" ? "justify-end" : "justify-start",
        )}
      >
        {attachments.map((attachment) => {
          const url = attachment.url || attachment.previewUrl;
          const ext = attachment.name.split(".").pop()?.toLowerCase() || "";

          let href = url;
          let isTextPreview = false;

          if (
            ["doc", "docx", "xls", "xlsx", "ppt", "pptx", "pdf"].includes(ext)
          ) {
            href = url; // Use direct URL for PDFs so the browser's native viewer handles it
          } else if (
            ["md", "txt", "csv", "json"].includes(ext) &&
            attachment.textContent
          ) {
            isTextPreview = true;
            href = undefined;
          }

          const Component = href || isTextPreview ? "a" : "span";

          return (
            <Component
              key={attachment.id}
              href={href}
              target={href ? "_blank" : undefined}
              rel={href ? "noopener noreferrer" : undefined}
              onClick={(e) => {
                if (isTextPreview && attachment.textContent) {
                  e.preventDefault();
                  setPreviewText({
                    name: attachment.name,
                    content: attachment.textContent,
                  });
                }
              }}
              className={cn(
                "flex items-center gap-2 rounded-full border border-border/70 bg-muted/60 px-2.5 py-1",
                (href || isTextPreview) &&
                  "hover:bg-muted/80 hover:text-foreground cursor-pointer transition-colors",
              )}
            >
              {attachment.previewUrl &&
                attachment.type.startsWith("image/") && (
                  <img
                    src={attachment.previewUrl}
                    alt={attachment.name}
                    className="size-7 rounded-md object-cover"
                    loading="lazy"
                  />
                )}
              {attachment.name}
            </Component>
          );
        })}
      </div>

      <Dialog
        open={!!previewText}
        onOpenChange={(open) => !open && setPreviewText(null)}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{previewText?.name}</DialogTitle>
            <DialogDescription className="sr-only">
              Text document preview
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 rounded-md border p-4 bg-muted/30 overflow-y-auto max-h-[60vh]">
            <pre className="text-sm whitespace-pre-wrap font-mono">
              {previewText?.content}
            </pre>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function AssistantBubble({
  message,
  isLast,
  streaming,
  onRegenerate,
  onInteractiveSubmit,
}: {
  message: ChatMessage;
  isLast: boolean;
  streaming: boolean;
  onRegenerate: () => void;
  onInteractiveSubmit?: (text: string) => void;
}) {
  let rawContent = message.content;
  let mcqQuestions: McqQuestion[] | null = null;
  const startIndex = rawContent.indexOf("<mcq>");

  if (startIndex !== -1) {
    const endIndex = rawContent.indexOf("</mcq>");
    if (endIndex !== -1) {
      const jsonStr = rawContent.substring(startIndex + 5, endIndex);
      rawContent =
        rawContent.substring(0, startIndex) +
        rawContent.substring(endIndex + 6);
      try {
        const parsedQuestions = mcqQuestionsSchema.safeParse(
          JSON.parse(jsonStr),
        );
        mcqQuestions = parsedQuestions.success ? parsedQuestions.data : null;
      } catch {
        console.error("Failed to parse MCQ data");
      }
    } else {
      // Hide partial block while streaming
      rawContent = rawContent.substring(0, startIndex);
    }
  }

  const handleMcqSubmit = (answers: Record<string, string>) => {
    if (!onInteractiveSubmit) return;
    const formatted = Object.entries(answers)
      .map(([qId, ans], idx) => `${idx + 1}. ${ans}`)
      .join("\n");
    onInteractiveSubmit(`Here are my answers:\n${formatted}`);
  };

  const isError = rawContent.startsWith("**Error:**");

  return (
    <div className="group flex items-start gap-3">
      <Avatar role="assistant" />
      <div className="min-w-0 flex-1">
        <MessageResponse isAnimating={streaming}>{rawContent}</MessageResponse>

        {isError && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRegenerate}
            className="mt-3 flex items-center gap-2"
          >
            <RefreshCw className="size-3.5" /> Retry
          </Button>
        )}

        {mcqQuestions && mcqQuestions.length > 0 && (
          <InteractiveMcq
            questions={mcqQuestions}
            onSubmit={handleMcqSubmit}
            disabled={!isLast || streaming}
          />
        )}

        {streaming && (
          <span className="ml-0.5 inline-block size-2 animate-pulse rounded-full bg-foreground/70 align-middle" />
        )}
        <div
          className={cn(
            "mt-2 flex items-center gap-1 transition-opacity",
            isLast && !streaming && !isError
              ? "opacity-100"
              : "opacity-0 group-hover:opacity-100",
          )}
        >
          <CopyButton text={message.content} mode="plain" />
          <CopyButton text={message.content} mode="markdown" />
          {isLast && !streaming && !isError && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onRegenerate}
              aria-label="Regenerate"
              className="text-muted-foreground"
            >
              <RefreshCw className="size-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, (m) =>
      m.replace(/^```[\w]*\n?/gm, "").replace(/```$/gm, ""),
    )
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/^\s*>\s*/gm, "")
    .replace(/^[-*_]{3,}\s*$/gm, "")
    .replace(/\|[-: ]+\|[-|: ]*/gm, "")
    .replace(/\|/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function CopyButton({
  text,
  mode,
}: {
  text: string;
  mode: "plain" | "markdown";
}) {
  const [copied, setCopied] = useState(false);
  const label = mode === "markdown" ? "Copy markdown" : "Copy";
  const icon =
    mode === "markdown" ? (
      <FileCode className="size-3.5" />
    ) : (
      <Copy className="size-3.5" />
    );

  function handleCopy() {
    const content = mode === "markdown" ? text : stripMarkdown(text);
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleCopy}
            aria-label={label}
            className="text-muted-foreground"
          >
            {copied ? <Check className="size-3.5" /> : icon}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Minimal markdown rendering has been replaced with the Streamdown component.
