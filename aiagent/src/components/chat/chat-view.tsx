"use client";

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  useEffect,
  useTransition,
} from "react";
import { ChatHeader } from "./header";
import { Composer } from "./composer";
import { MessageList } from "./message-list";
import { ChatHero, logoSrc, SUGGESTIONS } from "./hero";
import { ReleaseNotesModal } from "./release-notes-modal";
import { TokenCounter } from "./token-counter";
import { Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  newId,
  useThreadMessages,
  useThreads,
  type ChatMessage,
} from "@/lib/threads";
import { deepseekChat } from "@/lib/models/deepseek";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useSession } from "next-auth/react";
import { checkProAccess, requestProModelAccess } from "@/app/actions/user";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils";

type ChatModelId = "deepseek-v4-flash" | "deepseek-v4-pro";

const MODEL_OPTIONS: Array<{
  id: ChatModelId;
  label: string;
}> = [
  {
    id: "deepseek-v4-flash",
    label: "DeepSeek Flash (Marketing Agent)",
  },
  {
    id: "deepseek-v4-pro",
    label: "DeepSeek Pro (Marketing Agent)",
  },
];

interface Props {
  threadId: string | null;
}

const statusStore = new Map<string, "idle" | "submitted" | "streaming">();
const statusListeners = new Set<
  (threadId: string, status: "idle" | "submitted" | "streaming") => void
>();

export let pendingInitialMessage: {
  threadId: string;
  text: string;
  attachments: ChatMessage["attachments"];
} | null = null;

function setGlobalStatus(
  threadId: string,
  status: "idle" | "submitted" | "streaming",
) {
  statusStore.set(threadId, status);
  statusListeners.forEach((l) => l(threadId, status));
}

function useGlobalStatus(threadId: string | null) {
  const [status, setStatus] = useState<"idle" | "submitted" | "streaming">(
    () => {
      return (threadId ? statusStore.get(threadId) : undefined) || "idle";
    },
  );

  useEffect(() => {
    if (!threadId) return;
    setStatus(statusStore.get(threadId) || "idle");
    const handler = (
      id: string,
      newStatus: "idle" | "submitted" | "streaming",
    ) => {
      if (id === threadId) {
        setStatus(newStatus);
      }
    };
    statusListeners.add(handler);
    return () => {
      statusListeners.delete(handler);
    };
  }, [threadId]);

  const updateStatus = useCallback(
    (s: "idle" | "submitted" | "streaming", targetId?: string) => {
      const id = targetId || threadId;
      if (id) {
        setGlobalStatus(id, s);
      }
      setStatus(s);
    },
    [threadId],
  );

  return [status, updateStatus] as const;
}

const agentStatusStore = new Map<string, string>();
const agentStatusListeners = new Set<
  (threadId: string, status: string) => void
>();

function setGlobalAgentStatus(threadId: string, status: string) {
  agentStatusStore.set(threadId, status);
  agentStatusListeners.forEach((l) => l(threadId, status));
}

function useGlobalAgentStatus(threadId: string | null) {
  const [status, setStatus] = useState<string>(() => {
    return (
      (threadId ? agentStatusStore.get(threadId) : undefined) || "Cooking..."
    );
  });

  useEffect(() => {
    if (!threadId) return;
    setStatus(agentStatusStore.get(threadId) || "Cooking...");
    const handler = (id: string, newStatus: string) => {
      if (id === threadId) {
        setStatus(newStatus);
      }
    };
    agentStatusListeners.add(handler);
    return () => {
      agentStatusListeners.delete(handler);
    };
  }, [threadId]);

  const updateStatus = useCallback(
    (s: string, targetId?: string) => {
      const id = targetId || threadId;
      if (id) {
        setGlobalAgentStatus(id, s);
      }
      setStatus(s);
    },
    [threadId],
  );

  return [status, updateStatus] as const;
}

export function ChatView({ threadId }: Props) {
  const { messages, setMessages, isLoadingMessages } =
    useThreadMessages(threadId);
  const { threads, createThread, updateThread } = useThreads();
  const router = useRouter();
  const [status, setStatus] = useGlobalStatus(threadId);
  const [agentStatus, setAgentStatus] = useGlobalAgentStatus(threadId);
  const [modelId, setModelId] = useState<ChatModelId>("deepseek-v4-flash");
  const [showProAlert, setShowProAlert] = useState(false);
  const [pendingModel, setPendingModel] = useState<ChatModelId | null>(null);
  const { data: session } = useSession();
  const [databaseProAccess, setDatabaseProAccess] = useState<boolean | null>(
    null,
  );
  const [proAccessRequested, setProAccessRequested] = useState<boolean | null>(
    null,
  );
  const [isRequesting, setIsRequesting] = useState(false);
  const [hoveredPrompt, setHoveredPrompt] = useState<string | null>(null);
  const [isPendingNav, startTransition] = useTransition();

  useEffect(() => {
    let saved = localStorage.getItem("chat-model-id");
    if (saved && saved.startsWith("deepseek-v4-flash")) {
      saved = "deepseek-v4-flash";
    }
    if (saved && MODEL_OPTIONS.some((o) => o.id === saved)) {
      setModelId(saved as ChatModelId);
    }
  }, []);

  const activeGeneratingThreadIdRef = useRef<string | null>(null);
  const stopRef = useRef<() => void>(() => {});

  useEffect(() => {
    // If the thread ID changes, and we are currently generating for a DIFFERENT thread, stop it!
    if (
      activeGeneratingThreadIdRef.current &&
      activeGeneratingThreadIdRef.current !== threadId
    ) {
      stopRef.current?.();
      setStatus("idle");
    }
  }, [threadId, setStatus]);

  const currentThread = useMemo(
    () => threads.find((t) => t.id === threadId) ?? null,
    [threads, threadId],
  );

  const runModel = useCallback(
    async (afterMessages: ChatMessage[], targetThreadId?: string) => {
      const activeModel =
        MODEL_OPTIONS.find((option) => option.id === modelId) ??
        MODEL_OPTIONS[0];
      const handler =
        modelId === "deepseek-v4-flash" ? deepseekChat : deepseekChat;

      const toModelContent = (message: ChatMessage) => {
        if (!message.attachments || message.attachments.length === 0) {
          return message.content;
        }
        const lines = message.attachments.map((attachment) => {
          const sizeKb = (attachment.size / 1024).toFixed(1);
          return `- ${attachment.name} (${attachment.type || "file"}, ${sizeKb} KB)`;
        });
        const textParts = message.attachments
          .filter((attachment) => attachment.textContent)
          .map(
            (attachment) =>
              `\n\n[BEGIN UNTRUSTED ATTACHMENT DATA: ${JSON.stringify(attachment.name)}]\n${attachment.textContent}\n[END UNTRUSTED ATTACHMENT DATA]`,
          )
          .join("");

        const attachmentBlock = `\n\n[Attachments]\n${lines.join("\n")}`;
        return `${message.content}${attachmentBlock}${textParts}`.trim();
      };

      setStatus("submitted", targetThreadId);
      activeGeneratingThreadIdRef.current = targetThreadId ?? threadId;
      const assistantId = newId();
      let cancelled = false;

      stopRef.current = () => {
        cancelled = true;
        setStatus("idle", targetThreadId);
        activeGeneratingThreadIdRef.current = null;
      };

      const placeholder: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        createdAt: Date.now(),
      };

      let current = [...afterMessages, placeholder];
      setMessages(current, targetThreadId);

      try {
        setAgentStatus("Analyzing request...", targetThreadId);
        const rawResult = await handler({
          data: {
            model: modelId,
            messages: afterMessages.map((message) => ({
              role: message.role,
              content: toModelContent(message),
            })),
          },
        });

        let content = "";
        let usage: ChatMessage["usage"];

        if (
          rawResult &&
          typeof rawResult === "object" &&
          Symbol.asyncIterator in rawResult
        ) {
          for await (const chunk of rawResult as AsyncIterable<{
            type: string;
            message?: string;
            content?: string;
            usage?: ChatMessage["usage"];
          }>) {
            if (cancelled) return;
            if (chunk.type === "status" && typeof chunk.message === "string") {
              setAgentStatus(chunk.message, targetThreadId);
            } else if (
              chunk.type === "result" &&
              typeof chunk.content === "string"
            ) {
              content = chunk.content;
              usage = chunk.usage;
            }
          }
        } else if (
          rawResult &&
          typeof rawResult === "object" &&
          "content" in rawResult
        ) {
          content = (rawResult as { content?: string }).content || "";
          usage = (rawResult as { usage?: ChatMessage["usage"] }).usage;
        }

        if (cancelled) return;
        setStatus("streaming", targetThreadId);

        if (cancelled) {
          setStatus("idle", targetThreadId);
          return;
        }

        const parsedContent = content || "";
        const tokens = parsedContent.split(/(\s+)/);
        let i = 0;
        const tick = () => {
          if (cancelled) {
            setStatus("idle", targetThreadId);
            return;
          }
          if (i >= tokens.length) {
            setStatus("idle", targetThreadId);
            activeGeneratingThreadIdRef.current = null;

            // Save the final completed message content and actual API token usage
            current = current.map((m) =>
              m.id === assistantId
                ? { ...m, content: parsedContent, usage }
                : m,
            );
            setMessages(current, targetThreadId, true);

            // Auto-generate title after the first exchange
            if (targetThreadId && current.length === 2) {
              import("@/lib/title").then(({ generateTitle }) => {
                generateTitle(
                  current.map((m) => ({ role: m.role, content: m.content })),
                )
                  .then((newTitle) => {
                    updateThread(targetThreadId, {
                      title: newTitle,
                      titleGenerated: true,
                    });
                  })
                  .catch(console.error);
              });
            }

            return;
          }
          const slice = tokens.slice(i, i + 2).join("");
          i += 2;
          current = current.map((m) =>
            m.id === assistantId ? { ...m, content: m.content + slice } : m,
          );
          setMessages(current, targetThreadId, false);
          setTimeout(tick, 16);
        };
        tick();
      } catch (error) {
        const fallback = `I'm having trouble reaching ${activeModel.label} right now. Please try again shortly.`;
        const candidate = getErrorMessage(error, fallback);
        const isKnownMessage =
          /^(Unauthorized|Password setup required|Pro model access is required|Rate limit exceeded|Too many concurrent AI requests|DeepSeek rejected the configured API key|DeepSeek account balance is exhausted|DeepSeek is temporarily busy|DeepSeek is temporarily unavailable|DeepSeek request failed|The AI request did not finish in time|Could not reach DeepSeek)/.test(
            candidate,
          );
        const message = isKnownMessage ? candidate : candidate || fallback;
        current = current.map((m) =>
          m.id === assistantId ? { ...m, content: `**Error:** ${message}` } : m,
        );
        setMessages(current, targetThreadId);
        setStatus("idle", targetThreadId);
        activeGeneratingThreadIdRef.current = null;
      }
    },
    [modelId, setMessages, updateThread, setStatus, setAgentStatus, threadId],
  );

  const handleSubmit = useCallback(
    async (text: string, attachments: ChatMessage["attachments"]) => {
      const seed = text || attachments?.[0]?.name || "New chat";

      const isNew = !threadId;
      const targetId = threadId || newId();

      if (isNew) {
        // Store the initial message in memory and navigate first to prevent Next.js from
        // aborting Server Actions when the root component unmounts.
        pendingInitialMessage = {
          threadId: targetId,
          text,
          attachments: attachments ?? [],
        };
        startTransition(() => {
          router.push(`/chat/${targetId}`);
        });
        return;
      }

      const userMsg: ChatMessage = {
        id: newId(),
        role: "user",
        content: text,
        createdAt: Date.now(),
        attachments: attachments ?? [],
      };

      const next = [...messages, userMsg];

      // Immediately populate cache synchronously to avoid React Query fetching on new route.
      setMessages(next, targetId, true);

      if (currentThread && currentThread.title === "New chat") {
        updateThread(targetId, {
          title: seed.slice(0, 48) + (seed.length > 48 ? "…" : ""),
        });
      }

      runModel(next, targetId);
    },
    [
      messages,
      setMessages,
      runModel,
      threadId,
      router,
      currentThread,
      updateThread,
    ],
  );

  const handleRegenerate = useCallback(() => {
    const lastUserIdx = [...messages]
      .reverse()
      .findIndex((m) => m.role === "user");
    if (lastUserIdx === -1) return;
    const cutoff = messages.length - lastUserIdx;
    const trimmed = messages.slice(0, cutoff);
    setMessages(trimmed, threadId ?? undefined);
    runModel(trimmed, threadId ?? undefined);
  }, [messages, setMessages, runModel, threadId]);

  const handleEditUser = useCallback(
    (id: string, newContent: string) => {
      const idx = messages.findIndex((m) => m.id === id);
      if (idx === -1) return;
      const trimmed = messages.slice(0, idx);
      const newUser: ChatMessage = {
        ...messages[idx],
        content: newContent,
        createdAt: Date.now(),
        attachments: messages[idx].attachments,
      };
      const next = [...trimmed, newUser];
      setMessages(next, threadId ?? undefined);
      runModel(next, threadId ?? undefined);
    },
    [messages, setMessages, runModel, threadId],
  );

  const handleStop = useCallback(() => stopRef.current?.(), []);

  const title = currentThread?.title ?? "New chat";
  const activeModel =
    MODEL_OPTIONS.find((option) => option.id === modelId) ?? MODEL_OPTIONS[0];
  const hasMessages = messages.length > 0;

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Handle pending initial message after redirect from root route
  useEffect(() => {
    if (
      mounted &&
      threadId &&
      pendingInitialMessage &&
      pendingInitialMessage.threadId === threadId
    ) {
      const { text, attachments } = pendingInitialMessage;
      pendingInitialMessage = null; // consume immediately

      const seed = text || attachments?.[0]?.name || "New chat";
      const title = seed.slice(0, 48) + (seed.length > 48 ? "…" : "");

      const userMsg: ChatMessage = {
        id: newId(),
        role: "user",
        content: text,
        createdAt: Date.now(),
        attachments: attachments ?? [],
      };

      // Use existing messages if any, though it should be empty for a new thread
      const next = [...messages, userMsg];

      // Optimistically show the message without saving to DB yet (to avoid foreign key errors)
      setMessages(next, threadId, false);

      createThread(title, threadId)
        .then(() => {
          setMessages(next, threadId, true);
          runModel(next, threadId);
        })
        .catch((e) => {
          console.error("Failed to create thread via redirect", e);
          toast.error("Failed to start chat.");
        });
    }
  }, [mounted, threadId, messages, createThread, setMessages, runModel]);

  // Render live entitlements without allowing client-controlled session updates.
  const sessionUserId = session?.user?.id;
  const sessionProRequested = session?.user?.pro_model_requested;
  useEffect(() => {
    if (sessionUserId) {
      checkProAccess()
        .then((hasAccess) => {
          setDatabaseProAccess(hasAccess);
          setProAccessRequested(!!sessionProRequested);
        })
        .catch(() => {
          setDatabaseProAccess(false);
        });
    }
  }, [sessionUserId, sessionProRequested]);

  const canUsePro =
    session?.user?.role === "admin" ||
    (databaseProAccess ?? !!session?.user?.pro_model_access);
  const hasRequestedPro =
    proAccessRequested ?? !!session?.user?.pro_model_requested;

  const email = session?.user?.email || "";
  const namePart = email.split("@")[0] || "";
  const firstName = namePart.split(".")[0] || "Marketer";
  const capitalizedName =
    firstName.charAt(0).toUpperCase() + firstName.slice(1);

  const [randomGreeting] = useState(() => {
    const greetings = [
      // Time-based
      "Good morning",
      "Good afternoon",
      "Good evening",

      // Warm & inviting
      "Welcome back",
      "Great to see you",
      "Hey there",
      "Hello again",

      // Action-oriented
      "Ready when you are",
      "Let's make something great",
      "What are we building today",
      "Let's get to work",

      // Helper-focused
      "How can I help you today",
      "What's on your mind",
      "What can I do for you",
      "How can I be of help",

      // Energetic / motivational
      "Let's do something awesome",
      "Big ideas welcome",
      "Ready to build",
      "What's the plan today",
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  });

  const fullGreeting = `${randomGreeting}, ${capitalizedName}`;

  const composer = (
    <Composer
      onSubmit={handleSubmit}
      onStop={handleStop}
      status={status}
      autoFocusKey={threadId ?? "new"}
      modelLabel={activeModel.label}
      modelOptions={MODEL_OPTIONS}
      activeModelId={modelId}
      hoveredPrompt={hoveredPrompt}
      onModelChange={(nextModel) => {
        const id = nextModel as ChatModelId;
        if (id === "deepseek-v4-pro" && modelId !== "deepseek-v4-pro") {
          setPendingModel(id);
          setShowProAlert(true);
        } else {
          setModelId(id);
          localStorage.setItem("chat-model-id", id);
        }
      }}
    />
  );

  return (
    <div className="flex h-full flex-col relative overflow-hidden bg-background">
      <ChatHeader
        title={mounted && hasMessages ? title : "New chat"}
        threadId={threadId || undefined}
      />
      <ReleaseNotesModal />

      {/* Main scrollable area */}
      <motion.div
        layout
        className="flex flex-col flex-1 relative overflow-hidden"
      >
        <AnimatePresence mode="popLayout">
          {isLoadingMessages && threadId ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center gap-3"
            >
              <Loader2 className="size-6 animate-spin text-[#6FB941]" />
              <p className="text-sm text-muted-foreground animate-pulse">
                Loading message history...
              </p>
            </motion.div>
          ) : mounted && hasMessages ? (
            <motion.div
              key="messages"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 w-full h-full"
            >
              <MessageList
                messages={messages}
                status={status}
                onRegenerate={handleRegenerate}
                onEditUser={handleEditUser}
                onInteractiveSubmit={(text) => handleSubmit(text, [])}
                agentStatus={agentStatus}
              />
            </motion.div>
          ) : (
            <motion.div
              key="hero"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20, filter: "blur(4px)" }}
              className="flex flex-col items-center justify-end flex-1 pb-8 px-4"
            >
              {isPendingNav ? (
                <div className="flex flex-col items-center justify-center gap-4 mb-4">
                  <Loader2 className="size-8 animate-spin text-[#6FB941]" />
                  <p className="text-xl font-medium text-foreground animate-pulse">
                    Setting up workspace...
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#6FB941]/30 bg-[#6FB941]/10 px-3 py-1 text-xs font-medium text-[#6FB941] shadow-[0_4px_14px_-6px_rgba(111,185,65,0.25)]">
                    <span className="font-semibold">AiAgent-v2.0.0</span>
                    <span className="opacity-90">
                      Dual APP Support, AI Studio & AI Chat
                    </span>
                  </div>
                  <h1 className="text-center text-3xl font-semibold tracking-tight text-foreground sm:text-4xl flex items-center justify-center gap-3">
                    <img
                      src={logoSrc}
                      alt="Logo"
                      className="size-8 object-contain dark:invert"
                    />
                    {fullGreeting}
                  </h1>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Composer Area */}
      <motion.div layout className="shrink-0 w-full z-10 px-4 pb-4">
        <div className="mx-auto w-full max-w-3xl">
          <AnimatePresence>
            {mounted && hasMessages && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                <TokenCounter
                  messages={messages}
                  modelLabel={activeModel.label}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {composer}

          <AnimatePresence>
            {!hasMessages && mounted && (
              <motion.div
                key="suggestions"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                className="mt-6 w-full"
              >
                <div className="flex flex-wrap items-center justify-center gap-2.5 w-full max-w-3xl">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s.title}
                      type="button"
                      onMouseEnter={() => setHoveredPrompt(s.prompt)}
                      onMouseLeave={() => setHoveredPrompt(null)}
                      onClick={() => handleSubmit(s.prompt, [])}
                      className="group flex items-center cursor-pointer gap-2 rounded-full border border-border/50 bg-card/50 px-4 py-2 text-left transition-all hover:-translate-y-0.5 hover:border-border hover:bg-muted/50 hover:shadow-sm active:scale-95"
                    >
                      <s.icon className="size-3.5 text-muted-foreground transition-colors group-hover:text-foreground shrink-0" />
                      <span className="text-[13px] font-medium text-muted-foreground transition-colors group-hover:text-foreground">
                        {s.title}
                      </span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Bottom Spacer to keep the Composer centered when empty */}
      <AnimatePresence mode="popLayout">
        {!hasMessages && mounted && (
          <motion.div
            key="spacer"
            layout
            initial={{ flex: 1 }}
            animate={{ flex: 1 }}
            exit={{ flex: 0, opacity: 0 }}
            className="w-full"
          />
        )}
      </AnimatePresence>

      <AlertDialog open={showProAlert} onOpenChange={setShowProAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {canUsePro ? "Switch to DeepSeek Pro?" : "DeepSeek Pro Locked"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {canUsePro
                ? "You are switching to a more powerful, reasoning-focused Pro model. This model consumes tokens at a higher rate and may take longer to reply, but provides much deeper analysis and logic."
                : "The Pro model is currently locked for your account. You can request access from an admin to use this more powerful, reasoning-focused model."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingModel(null)}>
              {canUsePro ? "Revert to Flash" : "Close"}
            </AlertDialogCancel>

            {canUsePro ? (
              <AlertDialogAction
                className="bg-[#6FB941] hover:bg-[#5da035] text-white"
                onClick={() => {
                  if (pendingModel) {
                    setModelId(pendingModel);
                    localStorage.setItem("chat-model-id", pendingModel);
                  }
                }}
              >
                Continue
              </AlertDialogAction>
            ) : (
              <AlertDialogAction
                className="bg-[#6FB941] hover:bg-[#5da035] text-white"
                disabled={hasRequestedPro || isRequesting}
                onClick={async (e) => {
                  e.preventDefault();
                  if (hasRequestedPro) return;

                  setIsRequesting(true);
                  try {
                    await requestProModelAccess();
                    setProAccessRequested(true);
                    toast.success("Requested access to DeepSeek Pro");
                    setShowProAlert(false);
                  } catch (error: unknown) {
                    toast.error(
                      getErrorMessage(error, "Failed to request access"),
                    );
                  } finally {
                    setIsRequesting(false);
                  }
                }}
              >
                {hasRequestedPro
                  ? "Requested"
                  : isRequesting
                    ? "Requesting..."
                    : "Request Access"}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}