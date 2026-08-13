"use client";

import { createContext, useContext } from "react";

export const ChatSidebarContext = createContext<(() => void) | null>(null);

export function useChatSidebarToggle() {
  return useContext(ChatSidebarContext);
}
