"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

const ALL = "__all__";

export function LeadsToolbar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const debouncedQuery = useDebouncedValue(query, 300);

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

  function onSourceChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === ALL) {
      params.delete("source");
    } else {
      params.set("source", value);
    }
    const next = params.toString();
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
  }

  function onSegmentChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === ALL) {
      params.delete("segment");
    } else {
      params.set("segment", value);
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
          placeholder="Search by email or name…"
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
        value={searchParams.get("segment") ?? ALL}
        onValueChange={onSegmentChange}
      >
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue placeholder="All segments" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All segments</SelectItem>
          <SelectItem value="student">🎓 Students</SelectItem>
          <SelectItem value="parent">👨‍👩‍👧 Parents</SelectItem>
          <SelectItem value="educator">📚 Educators</SelectItem>
          <SelectItem value="school">🏫 School Admins</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("source") ?? ALL}
        onValueChange={onSourceChange}
      >
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All sources</SelectItem>
          <SelectItem value="lead-magnet">Lead magnets</SelectItem>
          <SelectItem value="landing-page">Landing pages</SelectItem>
          <SelectItem value="direct">Direct</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
