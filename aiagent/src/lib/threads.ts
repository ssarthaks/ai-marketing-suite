import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getThreads,
  createThreadRecord,
  updateThreadRecord,
  deleteThreadRecord,
  getMessages,
  saveMessagesRecord,
} from "@/app/actions/chat";
import { toast } from "sonner";

export type ChatRole = "user" | "assistant";

export interface ChatAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  textContent?: string;
  previewUrl?: string;
  url?: string;
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
  attachments?: ChatAttachment[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
}

export interface Thread {
  id: string;
  title: string;
  titleGenerated?: boolean;
  updatedAt: number;
  createdAt: number;
  projectId?: string | null;
}

export function newId(): string {
  if (
    typeof window !== "undefined" &&
    "crypto" in window &&
    "randomUUID" in window.crypto
  ) {
    return window.crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function useThreads() {
  const queryClient = useQueryClient();

  const { data: threads = [], isLoading: isLoadingThreads } = useQuery({
    queryKey: ["threads"],
    queryFn: () => getThreads(),
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  const createThread = useCallback(
    async (
      title = "New chat",
      providedId?: string,
      projectId?: string,
    ): Promise<Thread> => {
      const id = providedId || newId();
      const newThread = {
        id,
        title,
        projectId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // Optimistically update the UI cache
      queryClient.setQueryData(["threads"], (old: Thread[] = []) => [
        newThread,
        ...old,
      ]);

      try {
        await createThreadRecord(id, title, projectId);
      } catch (error) {
        console.error("Failed to create thread in DB", error);
        queryClient.setQueryData(["threads"], (old: Thread[] = []) =>
          old.filter((t) => t.id !== id),
        );
        toast.error("Failed to create chat. Please check your connection.");
        throw error;
      }

      return newThread;
    },
    [queryClient],
  );

  const updateThread = useCallback(
    async (id: string, patch: Partial<Thread>) => {
      let mergedThread: Thread | undefined;
      queryClient.setQueryData(["threads"], (old: Thread[]) =>
        old?.map((t) => {
          if (t.id === id) {
            mergedThread = { ...t, ...patch, updatedAt: Date.now() };
            return mergedThread;
          }
          return t;
        }),
      );

      if ((patch.title !== undefined || "projectId" in patch) && mergedThread) {
        await updateThreadRecord(
          id,
          mergedThread.title || "New chat",
          mergedThread.titleGenerated || false,
          mergedThread.projectId,
        );
        queryClient.invalidateQueries({ queryKey: ["threads"] });
      }
    },
    [queryClient],
  );

  const deleteThread = useCallback(
    async (id: string) => {
      queryClient.setQueryData(["threads"], (old: Thread[]) =>
        old?.filter((t) => t.id !== id),
      );
      await deleteThreadRecord(id);
      queryClient.invalidateQueries({ queryKey: ["threads"] });
    },
    [queryClient],
  );

  return {
    threads,
    createThread,
    updateThread,
    deleteThread,
    isLoadingThreads,
  };
}

export function useThreadMessages(threadId: string | null) {
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading: isLoadingMessages } = useQuery({
    queryKey: ["messages", threadId],
    queryFn: () => (threadId ? getMessages(threadId) : Promise.resolve([])),
    enabled: !!threadId,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  const setMessages = useCallback(
    (
      next: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[]),
      overrideThreadId?: string,
      saveToDb: boolean = true,
    ) => {
      const targetId = overrideThreadId || threadId;
      if (!targetId) return;

      // Cancel any active fetches to prevent stale data from overwriting optimistic updates
      queryClient.cancelQueries({ queryKey: ["messages", targetId] });

      queryClient.setQueryData(
        ["messages", targetId],
        (old: ChatMessage[] = []) => {
          const nextMessages = typeof next === "function" ? next(old) : next;
          // Background save to DB
          if (saveToDb) {
            saveMessagesRecord(targetId, nextMessages).catch((error) => {
              console.error("Failed to save messages to DB", error);
              toast.error(
                "Failed to sync messages. Please check your connection.",
              );
            });
          }
          return nextMessages;
        },
      );
    },
    [threadId, queryClient],
  );

  return { messages, setMessages, isLoadingMessages };
}
