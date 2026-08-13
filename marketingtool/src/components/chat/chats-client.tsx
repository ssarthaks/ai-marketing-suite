"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { MessageSquare, ExternalLink, Search, Filter } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatRelative } from "@/lib/format";

interface Thread {
  id: string;
  title: string | null;
  updatedAt: Date;
  createdAt: Date;
  projectId: string | null;
}

interface ChatsClientProps {
  threads: Thread[];
  productKey: string | null;
  initialProjectFilter?: string;
}

export function ChatsClient({
  threads,
  productKey,
  initialProjectFilter = "all",
}: ChatsClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] =
    useState<string>(initialProjectFilter);

  const uniqueProjects = Array.from(
    new Set(threads.map((t) => t.projectId).filter(Boolean)),
  ) as string[];

  const filteredThreads = threads.filter((thread) => {
    const matchesSearch = (thread.title || "New chat")
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesProject =
      initialProjectFilter === "all" ||
      thread.projectId === initialProjectFilter;
    return matchesSearch && matchesProject;
  });

  function handleProjectChange(val: string) {
    if (val === "all") {
      router.push("/chats");
    } else {
      router.push(`/chats/project/${encodeURIComponent(val)}`);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="relative w-full flex-1 sm:max-w-sm">
          <Search className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search chats..."
            className="pl-8 w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {!productKey && (
          <Select value={projectFilter} onValueChange={handleProjectChange}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <SelectValue placeholder="Filter by project" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {uniqueProjects.map((project) => (
                <SelectItem key={project} value={project}>
                  {project}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {filteredThreads.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center mt-6">
          <MessageSquare className="size-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium">No chats found</h3>
          <p className="text-muted-foreground mt-1 max-w-sm">
            {threads.length === 0
              ? productKey
                ? `You haven't linked any AiAgent chats to the ${productKey} project yet.`
                : "You don't have any chats in AiAgent yet."
              : "No chats match your current search and filters."}
          </p>
          <div className="mt-6">
            <a
              href="https://internal-chatbot-test.vercel.app"
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline font-medium inline-flex items-center gap-1"
            >
              Open AiAgent <ExternalLink className="size-3" />
            </a>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-6">
          {filteredThreads.map((thread) => (
            <Card
              key={thread.id}
              className="hover:border-primary/50 transition-colors flex flex-col h-full"
            >
              <CardHeader className="pb-3 flex-1">
                <CardTitle
                  className="text-base truncate"
                  title={thread.title || "New chat"}
                >
                  {thread.title || "New chat"}
                </CardTitle>
                <CardDescription>
                  {formatRelative(new Date(thread.updatedAt))}
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-4">
                <a
                  href={`https://internal-chatbot-test.vercel.app/chat/${thread.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                >
                  View in AiAgent <ExternalLink className="size-3" />
                </a>
              </CardContent>
              <CardFooter className="pt-0 pb-3 border-t px-6 pt-3 mt-auto bg-muted/20">
                <div
                  className="text-xs text-muted-foreground truncate w-full"
                  title={thread.projectId || "No project"}
                >
                  <span className="font-medium mr-1">Project:</span>
                  {thread.projectId || "None"}
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
