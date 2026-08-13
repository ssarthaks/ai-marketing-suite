"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown, FolderKanban, Layers, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { switchWorkspaceAction } from "@/features/workspaces/actions/workspace.actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import type { WorkspaceListItem } from "@/server/auth/session";

interface ProjectSwitcherProps {
  workspaces: WorkspaceListItem[];
  activeWorkspaceId: string;
}

/** What the backend is doing while a switch is in flight, in user terms. */
const SWITCH_STEPS = [
  "Verifying your access…",
  "Loading the project's brand profile…",
  "Fetching campaigns, content and assets…",
  "Preparing dashboard and analytics…",
];

function SwitchingOverlay({ projectName }: { projectName: string }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(
      () => setStep((current) => Math.min(current + 1, SWITCH_STEPS.length - 1)),
      900
    );
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-4 bg-background"
      role="status"
      aria-live="polite"
    >
      <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10">
        <Loader2 className="size-7 animate-spin text-primary" />
      </div>
      <div className="text-center">
        <p className="text-base font-semibold">
          Switching to {projectName}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {SWITCH_STEPS[step]}
        </p>
      </div>
    </div>
  );
}

export function ProjectSwitcher({
  workspaces = [],
  activeWorkspaceId,
}: ProjectSwitcherProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [targetName, setTargetName] = useState<string | null>(null);

  const safeWorkspaces = Array.isArray(workspaces) ? workspaces : [];
  const active = safeWorkspaces.find((ws) => ws.id === activeWorkspaceId);
  const projects = safeWorkspaces.filter((ws) => ws?.productKey);
  const personal = safeWorkspaces.filter((ws) => !ws?.productKey);

  function handleSelect(workspace: WorkspaceListItem) {
    if (workspace.id === activeWorkspaceId) return;
    setTargetName(workspace.name);
    startTransition(async () => {
      const result = await switchWorkspaceAction(workspace.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.push("/dashboard");
      router.refresh();
      toast.success(`Now working in ${workspace.name}`, {
        description: "Everything you see is scoped to this project.",
      });
    });
  }

  return (
    <>
      {isPending && targetName && <SwitchingOverlay projectName={targetName} />}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton
            size="lg"
            disabled={isPending}
            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          >
            <div className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <FolderKanban className="size-4" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">
                {active?.name ?? "Select project"}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {active?.productKey ? "Project" : "Personal workspace"}
              </span>
            </div>
            <ChevronsUpDown className="ml-auto size-4" />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
          side="bottom"
          align="start"
          sideOffset={4}
        >
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Projects
          </DropdownMenuLabel>
          {projects.map((ws) => (
            <DropdownMenuItem
              key={ws.id}
              onSelect={() => handleSelect(ws)}
              className="gap-2"
            >
              <Layers className="size-4 text-muted-foreground" />
              <span className="flex-1 truncate">{ws.name}</span>
              {ws.id === activeWorkspaceId && <Check className="size-4" />}
            </DropdownMenuItem>
          ))}
          {personal.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Personal
              </DropdownMenuLabel>
              {personal.map((ws) => (
                <DropdownMenuItem
                  key={ws.id}
                  onSelect={() => handleSelect(ws)}
                  className="gap-2"
                >
                  <FolderKanban className="size-4 text-muted-foreground" />
                  <span className="flex-1 truncate">{ws.name}</span>
                  {ws.id === activeWorkspaceId && <Check className="size-4" />}
                </DropdownMenuItem>
              ))}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
