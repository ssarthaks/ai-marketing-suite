"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ContentType } from "@prisma/client";
import { Search, Star, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { CONTENT_TYPE_LABELS } from "@/lib/constants";
import { getCollectionDisplayLabel } from "@/lib/content-display";
import { cn } from "@/lib/utils";

const ALL = "__all__";

interface LibraryToolbarProps {
  campaigns: { id: string; title: string }[];
  collections: string[];
}

export function LibraryToolbar({ campaigns, collections }: LibraryToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const debouncedQuery = useDebouncedValue(query, 300);

  const favoritesOnly = searchParams.get("favorites") === "1";

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (debouncedQuery.trim()) {
      params.set("q", debouncedQuery.trim());
    } else {
      params.delete("q");
    }
    const next = params.toString();
    if (next !== searchParams.toString()) {
      router.replace(next ? `${pathname}?${next}` : pathname, {
        scroll: false,
      });
    }
  }, [debouncedQuery]);

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null || value === ALL) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    const next = params.toString();
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
  }

  return (
    <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="relative w-full min-w-0 flex-1 sm:min-w-52">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search titles and content…"
          className="pl-9"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
      <Select
        value={searchParams.get("scope") ?? ALL}
        onValueChange={(value) => setParam("scope", value)}
      >
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue placeholder="All visibility" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All visibility</SelectItem>
          <SelectItem value="mine">My content</SelectItem>
          <SelectItem value="shared">Shared with me</SelectItem>
          <SelectItem value="public">Public</SelectItem>
          <SelectItem value="private">Private</SelectItem>
        </SelectContent>
      </Select>
      <Select
        value={searchParams.get("type") ?? ALL}
        onValueChange={(value) => setParam("type", value)}
      >
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All types</SelectItem>
          {Object.values(ContentType).map((type) => (
            <SelectItem key={type} value={type}>
              {CONTENT_TYPE_LABELS[type]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={searchParams.get("campaign") ?? ALL}
        onValueChange={(value) => setParam("campaign", value)}
      >
        <SelectTrigger className="w-full sm:w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All campaigns</SelectItem>
          {campaigns.map((campaign) => (
            <SelectItem key={campaign.id} value={campaign.id}>
              {campaign.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {collections.length > 0 && (
        <Select
          value={searchParams.get("collection") ?? ALL}
          onValueChange={(value) => setParam("collection", value)}
        >
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All collections</SelectItem>
            {collections.map((collection) => (
              <SelectItem key={collection} value={collection}>
                {getCollectionDisplayLabel(collection)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <Button
        variant={favoritesOnly ? "secondary" : "outline"}
        size="sm"
        className="h-9 w-full sm:w-auto"
        onClick={() => setParam("favorites", favoritesOnly ? null : "1")}
      >
        <Star
          className={cn(
            "size-4",
            favoritesOnly && "fill-amber-400 text-amber-400"
          )}
        />
        Favorites
      </Button>
    </div>
  );
}
