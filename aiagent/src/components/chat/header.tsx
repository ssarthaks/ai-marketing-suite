import {
  ChevronDown,
  MoreHorizontal,
  Share2,
  Download,
  Link as LinkIcon,
  PanelLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NavbarUsage } from "./navbar-usage";
import { useThreads } from "@/lib/threads";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useChatSidebarToggle } from "./sidebar-context";

interface Props {
  title: string;
  className?: string;
  threadId?: string;
}

const PROJECTS = [
  { id: "demo-saas", name: "Demo SaaS (Acme Suite)" },
  { id: "demo-edtech", name: "Demo EdTech (EduSpark)" },
  { id: "demo-ecommerce", name: "Demo E-Commerce (ArtisanCraft)" },
];

export function ChatHeader({ title, className, threadId }: Props) {
  const toggleSidebar = useChatSidebarToggle();
  const { threads, updateThread } = useThreads();
  const currentThread = threads.find((t) => t.id === threadId);
  const selectedProject = currentThread?.projectId || "none";

  const handleProjectChange = (val: string) => {
    if (!threadId) return;
    updateThread(threadId, { projectId: val === "none" ? null : val });
  };

  return (
    <header
      className={cn(
        "flex h-14 shrink-0 items-center justify-between border-b border-border/60 bg-background/80 px-4 backdrop-blur",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3 mr-2">
        {toggleSidebar && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
            className="-ml-1 shrink-0 text-muted-foreground"
          >
            <PanelLeft className="size-4" />
          </Button>
        )}
        {toggleSidebar && (
          <div className="h-4 w-px shrink-0 bg-border" aria-hidden="true" />
        )}
        <h1 className="truncate text-sm font-semibold min-w-0">{title}</h1>

        {threadId && (
          <div className="ml-2 hidden md:flex items-center">
            <Select value={selectedProject} onValueChange={handleProjectChange}>
              <SelectTrigger className="h-8 w-[200px] bg-muted/50 border-0 focus:ring-0">
                <div className="flex items-center gap-2">
                  <LinkIcon className="size-3.5 text-muted-foreground" />
                  <SelectValue placeholder="Link to project" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Project Linked</SelectItem>
                {PROJECTS.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <NavbarUsage />
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground gap-1.5 h-8 mr-1 hidden sm:flex"
          asChild
        >
          <a href="/aiagent-manual.md" download="AiAgent User Manual.md">
            <Download className="size-4" />
            Download Manual
          </a>
        </Button>
      </div>
    </header>
  );
}
