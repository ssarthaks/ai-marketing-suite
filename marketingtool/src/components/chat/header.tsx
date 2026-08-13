import {
  ChevronDown,
  MoreHorizontal,
  Share2,
  Download,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NavbarUsage } from "./navbar-usage";

interface Props {
  title: string;
  className?: string;
  threadId?: string;
}

export function ChatHeader({ title, className, threadId }: Props) {
  return (
    <header
      className={cn(
        "flex h-14 shrink-0 items-center justify-between border-b border-border/60 bg-background/80 px-4 backdrop-blur",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3 mr-2">
        <h1 className="truncate text-sm font-semibold min-w-0">{title}</h1>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <NavbarUsage />
        {threadId && (
          <Button
            variant="outline"
            size="sm"
            className="text-primary border-primary/30 bg-primary/5 hover:bg-primary/10 gap-1.5 h-8 mr-1 hidden sm:flex"
            asChild
          >
            <a
              href={`https://internal-chatbot-test.vercel.app/chat/${threadId}`}
              target="_blank"
              rel="noreferrer"
            >
              Continue in AiAgent
              <ExternalLink className="size-3" />
            </a>
          </Button>
        )}
      </div>
    </header>
  );
}
