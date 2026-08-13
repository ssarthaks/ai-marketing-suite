"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  FilePlus2,
  Loader2,
  Magnet,
  Megaphone,
  Search,
  Sparkles,
  Upload,
} from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { ALL_NAV_ITEMS } from "@/lib/navigation";
import {
  SEARCH_GROUP_LABELS,
  type SearchResult,
} from "@/features/search/types";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

export const OPEN_COMMAND_PALETTE_EVENT = "marketingos:open-command-palette";

export function openCommandPalette() {
  window.dispatchEvent(new CustomEvent(OPEN_COMMAND_PALETTE_EVENT));
}

const QUICK_ACTIONS = [
  { title: "New Campaign", href: "/campaigns/new", icon: Megaphone },
  { title: "Generate Content", href: "/ai-studio", icon: Sparkles },
  { title: "Upload Asset", href: "/assets", icon: Upload },
  { title: "New Landing Page", href: "/landing-pages/new", icon: FilePlus2 },
  { title: "New Lead Magnet", href: "/lead-magnets/new", icon: Magnet },
];

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 250);
  const trimmedQuery = debouncedQuery.trim();

  // Cached per query string, so reopening the palette or retyping a recent
  // search serves instantly from the TanStack Query cache instead of refetching.
  const { data: results = [], isFetching: isSearching } = useQuery({
    queryKey: ["workspace-search", trimmedQuery],
    queryFn: async ({ signal }): Promise<SearchResult[]> => {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(trimmedQuery)}`,
        { signal }
      );
      if (!response.ok) return [];
      const data: { results: SearchResult[] } = await response.json();
      return data.results ?? [];
    },
    enabled: open && trimmedQuery.length >= 2,
    staleTime: 60 * 1000,
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((current) => !current);
      }
    }
    function onOpenEvent() {
      setOpen(true);
    }
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener(OPEN_COMMAND_PALETTE_EVENT, onOpenEvent);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(OPEN_COMMAND_PALETTE_EVENT, onOpenEvent);
    };
  }, []);

  const run = useCallback((command: () => void) => {
    setOpen(false);
    setQuery("");
    command();
  }, []);

  const groupedResults = results.reduce<Map<string, SearchResult[]>>(
    (groups, result) => {
      const group = groups.get(result.group) ?? [];
      group.push(result);
      groups.set(result.group, group);
      return groups;
    },
    new Map()
  );

  return (
    <CommandDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
      title="Command palette"
      description="Search your workspace or jump to a page"
      commandProps={{ shouldFilter: results.length === 0 }}
    >
      <CommandInput
        placeholder="Search campaigns, content, assets…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {isSearching ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" /> Searching…
            </span>
          ) : (
            "No results found."
          )}
        </CommandEmpty>
        {[...groupedResults.entries()].map(([group, items]) => (
          <CommandGroup
            key={group}
            heading={SEARCH_GROUP_LABELS[group] ?? group}
          >
            {items.map((result) => (
              <CommandItem
                key={`${result.group}-${result.id}`}
                value={`${result.group}-${result.id}-${result.title}`}
                onSelect={() => run(() => router.push(result.href))}
              >
                <Search />
                <span className="truncate">{result.title}</span>
                {result.subtitle && (
                  <span className="ml-auto truncate text-xs text-muted-foreground">
                    {result.subtitle}
                  </span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
        {results.length > 0 && <CommandSeparator />}
        <CommandGroup heading="Go to">
          {ALL_NAV_ITEMS.map((item) => (
            <CommandItem
              key={item.href}
              value={`goto-${item.title}`}
              onSelect={() => run(() => router.push(item.href))}
            >
              <item.icon />
              {item.title}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Quick actions">
          {QUICK_ACTIONS.map((action) => (
            <CommandItem
              key={action.title}
              value={`action-${action.title}`}
              onSelect={() => run(() => router.push(action.href))}
            >
              <action.icon />
              {action.title}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
