"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import {
  MessageSquarePlus,
  Search,
  Settings,
  Trash2,
  PanelLeftClose,
  PanelLeftOpen,
  MessageSquare,
  Pencil,
  Check,
  Cpu,
  Loader2,
  LogOut,
  Users,
  ExternalLink,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import logo from "@/assets/logo-v2.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useThreads } from "@/lib/threads";
import { toast } from "sonner";
import { listAgentFiles } from "@/app/actions/agents";
import { useSession, signOut } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";

interface Props {
  collapsed: boolean;
  onToggle?: () => void;
}

export function ChatSidebar({ collapsed, onToggle }: Props) {
  const {
    threads,
    createThread,
    deleteThread,
    updateThread,
    isLoadingThreads,
  } = useThreads();
  const router = useRouter();
  const params = useParams() as { threadId?: string };
  const activeId = params?.threadId;
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [productsOpen, setProductsOpen] = useState(false);
  const { data: session } = useSession();
  const canEditProducts =
    session?.user?.role === "admin" || session?.user?.role === "team_lead";

  const { data: agentFiles = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: ["agentFiles"],
    queryFn: () => listAgentFiles(),
    enabled: canEditProducts,
    staleTime: 5 * 60 * 1000,
  });

  const filtered = useMemo(() => {
    if (!query.trim()) return threads;
    const q = query.toLowerCase();
    return threads.filter((t) => t.title.toLowerCase().includes(q));
  }, [threads, query]);

  const handleNew = async () => {
    const t = await createThread();
    router.push(`/chat/${t.id}`);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    deleteThread(id);
    toast.success("Chat deleted");
    if (activeId === id) router.push("/");
  };

  const startEdit = (id: string, currentTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setEditingId(id);
    setEditTitle(currentTitle);
  };

  const saveEdit = (id: string) => {
    if (
      editTitle.trim() &&
      editTitle.trim() !== threads.find((t) => t.id === id)?.title
    ) {
      updateThread(id, { title: editTitle.trim() });
    }
    setEditingId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === "Enter") saveEdit(id);
    if (e.key === "Escape") setEditingId(null);
  };

  const handleProductsToggle = () => {
    if (collapsed) {
      setProductsOpen(true);
      onToggle?.();
      return;
    }

    setProductsOpen((open) => !open);
  };

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const email = session?.user?.email || "";
  let displayName = "You";
  let initial = "U";
  if (email) {
    const parts = email.split("@")[0].split(".");
    if (parts.length >= 2) {
      const first = parts[0];
      const last = parts[1];
      displayName = `${first.charAt(0).toUpperCase() + first.slice(1)} ${last.charAt(0).toUpperCase() + last.slice(1)}`;
      initial = first.charAt(0).toUpperCase();
    } else {
      displayName = email.split("@")[0];
      initial = displayName.charAt(0).toUpperCase();
    }
  }

  return (
    <aside
      className={cn(
        "flex h-full max-w-[calc(100vw-0.75rem)] shrink-0 flex-col border-r border-border bg-sidebar transition-[width] duration-300 ease-out",
        collapsed ? "w-[68px]" : "w-[280px]",
      )}
    >
      <div
        className={cn(
          "flex h-14 items-center px-3",
          collapsed && "justify-center",
        )}
      >
        <Link
          href="/"
          title={collapsed ? "AiAgent — AI Chatbot" : undefined}
          className="flex items-center gap-2 overflow-hidden pt-2 pl-[6px]"
        >
          <img
            src={logo.src}
            alt="AiAgent"
            width={32}
            height={32}
            className="shrink-0 rounded-md dark:invert"
          />
          {!collapsed && (
            <span className="text-base font-semibold tracking-tight">
              AiAgent - AI Chatbot
            </span>
          )}
        </Link>
      </div>

      <div className="px-3 pt-4">
        <Button
          onClick={handleNew}
          className={cn(
            "w-full justify-start gap-2 rounded-xl bg-[#6FB941] text-white shadow-sm hover:bg-[#6FB941]/90",
            collapsed && "justify-center px-0",
          )}
          size="default"
        >
          <MessageSquarePlus className="size-4" />
          {!collapsed && <span>New chat</span>}
        </Button>
      </div>

      {!collapsed && (
        <div className="px-3 pt-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search chats"
              className="h-9 rounded-lg border-transparent bg-muted/60 pl-9 text-sm focus-visible:bg-background"
            />
          </div>
        </div>
      )}

      <nav className="mt-3 flex-1 overflow-y-auto custom-scrollbar px-2 pb-2">
        {!collapsed && (
          <div className="px-2 pb-1 pt-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Recent ({filtered.length})
          </div>
        )}
        {mounted && !isLoadingThreads ? (
          <>
            {filtered.length === 0 && !collapsed && (
              <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                No conversations yet
              </div>
            )}
            <ul className="flex flex-col">
              {filtered.map((t) => {
                const isActive = t.id === activeId;
                return (
                  <li key={t.id}>
                    <div
                      className={cn(
                        "group flex min-h-8 items-center gap-2 rounded-lg px-2 py-1 text-sm transition-colors",
                        isActive
                          ? "bg-accent text-foreground"
                          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                      )}
                    >
                      {editingId === t.id ? (
                        <div className="flex flex-1 items-center gap-2 overflow-hidden px-1">
                          <MessageSquare className="size-4 shrink-0 opacity-70" />
                          <input
                            autoFocus
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, t.id)}
                            onBlur={() => saveEdit(t.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full bg-background/50 border border-border/50 rounded px-1.5 py-0.5 text-sm outline-none focus:ring-1 focus:ring-ring"
                          />
                        </div>
                      ) : (
                        <Link
                          href={`/chat/${t.id}`}
                          className="flex flex-1 items-center gap-2 overflow-hidden"
                          title={t.title}
                        >
                          <MessageSquare className="size-4 shrink-0 opacity-70" />
                          {!collapsed && (
                            <span className="truncate">{t.title}</span>
                          )}
                        </Link>
                      )}

                      {!collapsed && editingId !== t.id && (
                        <div className="flex items-center gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={(e) => startEdit(t.id, t.title, e)}
                            aria-label="Edit title"
                            className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                          >
                            <Pencil className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDelete(t.id, e)}
                            aria-label="Delete chat"
                            className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-background hover:text-destructive"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <div
            className={cn(
              "flex w-full items-center gap-2 px-3 py-6 text-sm text-[#6FB941]",
              collapsed && "justify-center px-0",
            )}
          >
            <Loader2 className="size-4 animate-spin shrink-0" />
            {!collapsed && (
              <span className="text-muted-foreground">Loading chats...</span>
            )}
          </div>
        )}
      </nav>

      <div className="border-t border-border p-2">
        {(session?.user?.role === "admin" ||
          session?.user?.role === "team_lead") &&
          (agentFiles.length > 0 || isLoadingProducts) && (
            <div className="mb-2">
              <button
                type="button"
                onClick={handleProductsToggle}
                aria-expanded={!collapsed && productsOpen}
                aria-controls="agent-products-list"
                title={collapsed ? "Open Product Details" : undefined}
                className={cn(
                  "group/products flex w-full cursor-pointer items-center gap-2 rounded-lg border border-transparent py-2 text-left transition-all hover:border-border hover:bg-accent/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  collapsed ? "justify-center px-0" : "px-2.5",
                )}
              >
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-md bg-[#6FB941]/12 text-[#6FB941] transition-all group-hover/products:bg-[#6FB941]/20",
                    collapsed && "size-9 border border-[#6FB941]/30 shadow-sm",
                  )}
                >
                  <Cpu className="size-4" />
                </span>
                {!collapsed && (
                  <>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-semibold text-foreground">
                        Product Details
                      </span>
                      <span className="block text-[10px] text-muted-foreground">
                        {productsOpen ? "Hide" : "View"} {agentFiles.length}{" "}
                        {agentFiles.length === 1 ? "product" : "products"}
                      </span>
                    </span>
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors group-hover/products:bg-background group-hover/products:text-foreground">
                      <ChevronDown
                        className={cn(
                          "size-3.5 transition-transform duration-200 rotate-180",
                          productsOpen && "rotate-360",
                        )}
                      />
                    </span>
                  </>
                )}
              </button>

              <AnimatePresence initial={false}>
                {productsOpen && !collapsed && (
                  <motion.div
                    id="agent-products-list"
                    initial={{ height: 0, opacity: 0, y: -8 }}
                    animate={{ height: "auto", opacity: 1, y: 0 }}
                    exit={{ height: 0, opacity: 0, y: -8 }}
                    transition={{ duration: 0.22, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    {isLoadingProducts ? (
                      <div
                        className={cn(
                          "flex w-full items-center gap-2 px-2 py-1.5 text-sm text-[#6FB941]",
                          collapsed && "justify-center px-0",
                        )}
                      >
                        <Loader2 className="size-4 animate-spin shrink-0" />
                        {!collapsed && (
                          <span className="text-muted-foreground">
                            Loading products...
                          </span>
                        )}
                      </div>
                    ) : (
                      <ul className="custom-scrollbar flex max-h-[160px] flex-col gap-0.5 overflow-y-auto pr-1">
                        {agentFiles.map((file) => {
                          const displayName = file.replace(/[-_]/g, " ");
                          return (
                            <li key={file}>
                              <Link
                                href={`/admin/editor/${file}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={cn(
                                  "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm capitalize text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                                  collapsed && "justify-center px-0",
                                )}
                                title={displayName}
                              >
                                <Cpu className="size-4 shrink-0 text-[#6FB941]" />
                                {!collapsed && (
                                  <span className="truncate text-left">
                                    {displayName}
                                  </span>
                                )}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

        {/* <button
          type="button"
          onClick={() => toast("Settings coming soon")}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
            collapsed && "justify-center",
          )}
        >
          <Settings className="size-4" />
          {!collapsed && <span>Settings</span>}
        </button> */}
        <Link
          href="/api/sso-redirect"
          target="_blank"
          rel="noopener noreferrer"
          title="Open AI Marketing Platform"
          className={cn(
            "my-2 flex w-full items-center justify-between gap-2 rounded-lg border border-[#6FB941]/50 bg-gradient-to-r from-[#6FB941]/15 via-[#8ad15b]/25 to-[#6FB941]/10 px-3 py-2.5 text-sm font-semibold text-foreground shadow-sm transition-all hover:bg-gradient-to-r hover:from-[#6FB941]/30 hover:to-[#8ad15b]/40 hover:border-[#6FB941]/70 hover:shadow-md",
            collapsed && "justify-center px-0",
          )}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 shrink-0 text-[#6FB941]" />
            {!collapsed && (
              <span className="font-semibold text-foreground">
                AI Marketing OS
              </span>
            )}
          </div>
        </Link>
        <Link
          href="/profile"
          className={cn(
            "mt-1 border-t border-2 flex items-center gap-2 rounded-lg px-2 py-2 transition-colors hover:bg-accent",
            collapsed && "justify-center",
          )}
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#8ad15b] to-[#6FB941] text-xs font-semibold text-white shadow-sm">
            {initial}
          </div>
          {!collapsed && (
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium">
                {displayName}
              </span>
              <span className="truncate text-[10px] text-muted-foreground uppercase tracking-wider">
                {session?.user?.role?.replace("_", " ")}
              </span>
            </div>
          )}
        </Link>
        {session?.user?.role === "admin" && (
          <Link
            href="/admin/users"
            title="Manage Users"
            className={cn(
              "mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
              collapsed && "justify-center px-0",
            )}
          >
            <Users className="size-4 shrink-0" />
            {!collapsed && <span>Manage Users</span>}
          </Link>
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          title="Sign out"
          className={cn(
            "mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-destructive/10 cursor-pointer hover:text-destructive",
            collapsed && "justify-center px-0",
          )}
        >
          <LogOut className="size-4 shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
