import type { ReactNode } from "react";
import { Layers } from "lucide-react";

import { resolveWorkspace } from "@/server/auth/session";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

/**
 * Server component. Renders the page title plus a badge naming the active
 * project, so every page states which project its content belongs to.
 */
export async function PageHeader({
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  const scope = await resolveWorkspace();

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col items-stretch gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between",
        className
      )}
    >
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
        </div>
        {description && (
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          {actions}
        </div>
      )}
    </div>
  );
}
