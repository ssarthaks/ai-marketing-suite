"use client";

import { useMemo } from "react";
import { Zap, ArrowUp, ArrowDown, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/lib/threads";

/**
 * Approximate token count using the ~4 chars per token heuristic.
 * This is a rough estimate — actual tokenization varies by model.
 */
function estimateTokens(text: string): number {
  if (!text) return 0;
  // GPT/LLM tokenizer heuristic: ~4 chars per token for English
  return Math.ceil(text.length / 4);
}

interface TokenCounterProps {
  messages: ChatMessage[];
  modelLabel: string;
  className?: string;
}

import { MODEL_PRICING } from "@/lib/pricing";

export function TokenCounter({
  messages,
  modelLabel,
  className,
}: TokenCounterProps) {
  const stats = useMemo(() => {
    let inputTokens = 0;
    let outputTokens = 0;
    let userMessages = 0;
    let assistantMessages = 0;

    // Track which message IDs are covered by actual assistant usage reports
    const coveredMessageIds = new Set<string>();

    // First, find all assistant messages with usage and add their tokens
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      if (msg.role === "assistant") {
        assistantMessages++;
        if (msg.usage) {
          inputTokens += msg.usage.promptTokens;
          outputTokens += msg.usage.completionTokens;

          // Mark this assistant message as covered
          coveredMessageIds.add(msg.id);
          // Also mark user message(s) prior to it (since the previous assistant message) as covered
          for (let j = i - 1; j >= 0; j--) {
            if (messages[j].role === "assistant") {
              break;
            }
            coveredMessageIds.add(messages[j].id);
          }
        }
      } else if (msg.role === "user") {
        userMessages++;
      }
    }

    // For any messages that are NOT covered, fallback to estimateTokens
    for (const msg of messages) {
      if (!coveredMessageIds.has(msg.id)) {
        const estimated = estimateTokens(msg.content);
        if (msg.role === "user") {
          inputTokens += estimated;
        } else if (msg.role === "assistant") {
          outputTokens += estimated;
        }
      }
    }

    return {
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      userMessages,
      assistantMessages,
      totalMessages: userMessages + assistantMessages,
    };
  }, [messages]);

  if (stats.totalMessages === 0) return null;

  // Find model pricing
  const modelKey = Object.keys(MODEL_PRICING).find((key) =>
    modelLabel.toLowerCase().includes(key.toLowerCase().split("-")[0]),
  );
  const pricing = modelKey ? MODEL_PRICING[modelKey] : null;
  const estimatedCost = pricing
    ? (stats.inputTokens * pricing.input +
        stats.outputTokens * pricing.output) /
      1_000_000
    : null;

  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-3xl items-center justify-center gap-1 px-4 py-1.5",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-full border border-border/50 bg-muted/40 px-3 py-1 text-[11px] text-muted-foreground backdrop-blur-sm">
        {/* Total tokens */}
        <span
          className="flex items-center gap-1 font-medium"
          title="Total estimated tokens"
        >
          <Zap className="size-3 text-amber-500" />
          {stats.totalTokens.toLocaleString()} tokens
        </span>

        <span className="hidden text-border/80 sm:inline">|</span>

        {/* Input tokens */}
        <span
          className="hidden items-center gap-1 sm:flex"
          title="Input tokens (your messages)"
        >
          <ArrowUp className="size-3 text-blue-400" />
          {stats.inputTokens.toLocaleString()}
        </span>

        {/* Output tokens */}
        <span
          className="hidden items-center gap-1 sm:flex"
          title="Output tokens (AI responses)"
        >
          <ArrowDown className="size-3 text-emerald-400" />
          {stats.outputTokens.toLocaleString()}
        </span>

        <span className="hidden text-border/80 sm:inline">|</span>

        {/* Message count */}
        <span
          className="hidden items-center gap-1 sm:flex"
          title="Total messages"
        >
          <MessageSquare className="size-3 text-violet-400" />
          {stats.totalMessages}
        </span>

        {/* Estimated cost */}
        {estimatedCost !== null && estimatedCost > 0 && (
          <>
            <span className="hidden text-border/80 md:inline">|</span>
            <span
              className="hidden items-center gap-1 md:flex"
              title="Estimated API cost"
            >
              ~$
              {estimatedCost < 0.01
                ? estimatedCost.toFixed(4)
                : estimatedCost.toFixed(3)}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
