"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { SectionType } from "@prisma/client";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ExternalLink,
  Globe,
  GlobeLock,
  Loader2,
  Pencil,
  Plus,
  Settings2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { SECTION_TYPE_LABELS } from "@/lib/constants";
import {
  addSectionAction,
  deleteLandingPageAction,
  deleteSectionAction,
  moveSectionAction,
  setLandingPagePublishedAction,
} from "@/features/landing-pages/actions/landing-page.actions";
import type { LandingPageEditorData } from "@/features/landing-pages/server/landing-pages.service";
import { SectionForm } from "./section-forms";
import { SectionRenderer } from "./section-renderer";
import { PageSettingsDialog } from "./page-settings-dialog";

type EditorSection = LandingPageEditorData["sections"][number];

export function PageEditor({ page }: { page: LandingPageEditorData }) {
  const router = useRouter();
  const params = useParams<{ workspaceId?: string }>();
  const prefix = params?.workspaceId ? `/${params.workspaceId}` : "";
  const [editingSection, setEditingSection] = useState<EditorSection | null>(
    null
  );
  const [confirmDeletePage, setConfirmDeletePage] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isPublished = page.status === "PUBLISHED";

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok && result.error) {
        toast.error(result.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`${prefix}/landing-pages`}
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Landing pages
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">
              {page.title}
            </h1>
            <Badge variant={isPublished ? "default" : "secondary"}>
              {isPublished ? "Published" : "Draft"}
            </Badge>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <PageSettingsDialog page={page}>
              <Button variant="outline" size="sm">
                <Settings2 className="size-4" />
                Settings
              </Button>
            </PageSettingsDialog>
            {isPublished && (
              <Button asChild variant="outline" size="sm">
                <a
                  href={`/p/${page.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="size-4" />
                  View live
                </a>
              </Button>
            )}
            <Button
              size="sm"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  const result = await setLandingPagePublishedAction(
                    page.id,
                    !isPublished
                  );
                  if (result.ok) {
                    toast.success(
                      result.data.status === "PUBLISHED"
                        ? `Published at /p/${page.slug}`
                        : "Page unpublished"
                    );
                    router.refresh();
                  } else {
                    toast.error(result.error);
                  }
                })
              }
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : isPublished ? (
                <GlobeLock className="size-4" />
              ) : (
                <Globe className="size-4" />
              )}
              {isPublished ? "Unpublish" : "Publish"}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground hover:text-destructive"
              onClick={() => setConfirmDeletePage(true)}
              aria-label="Delete page"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>
        <p className="mt-1.5 text-sm text-muted-foreground">
          /p/{page.slug}
          {page.campaign && <> · Campaign: {page.campaign.title}</>}
          {isPublished && <> · {page.views} views</>}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground">
              Sections
            </h2>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="size-3.5" />
                  Add
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {Object.values(SectionType).map((type) => (
                  <DropdownMenuItem
                    key={type}
                    onSelect={() =>
                      run(() => addSectionAction(page.id, type))
                    }
                  >
                    {SECTION_TYPE_LABELS[type]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <ul className="space-y-2">
            {page.sections.map((section, index) => (
              <li
                key={section.id}
                className="flex items-center gap-1.5 rounded-lg border bg-card px-3 py-2.5"
              >
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {SECTION_TYPE_LABELS[section.type]}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  disabled={index === 0 || isPending}
                  onClick={() => run(() => moveSectionAction(section.id, "up"))}
                  aria-label="Move up"
                >
                  <ArrowUp className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  disabled={index === page.sections.length - 1 || isPending}
                  onClick={() =>
                    run(() => moveSectionAction(section.id, "down"))
                  }
                  aria-label="Move down"
                >
                  <ArrowDown className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={() => setEditingSection(section)}
                  aria-label="Edit section"
                >
                  <Pencil className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground hover:text-destructive"
                  disabled={isPending}
                  onClick={() =>
                    run(() => deleteSectionAction(section.id))
                  }
                  aria-label="Delete section"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </li>
            ))}
          </ul>
          {page.sections.length === 0 && (
            <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
              Add your first section to start building.
            </p>
          )}
        </div>

        <div className="overflow-hidden rounded-xl border bg-background shadow-sm">
          <div className="flex items-center gap-1.5 border-b bg-muted/50 px-4 py-2">
            <span className="size-2.5 rounded-full bg-red-400/70" />
            <span className="size-2.5 rounded-full bg-amber-400/70" />
            <span className="size-2.5 rounded-full bg-emerald-400/70" />
            <span className="ml-3 truncate text-xs text-muted-foreground">
              /p/{page.slug}
            </span>
          </div>
          <div className="max-h-[75vh] overflow-y-auto">
            {page.sections.length === 0 ? (
              <div className="flex min-h-[300px] items-center justify-center text-sm text-muted-foreground">
                Your page preview will appear here.
              </div>
            ) : (
              page.sections.map((section) => (
                <div
                  key={section.id}
                  className="group relative cursor-pointer"
                  onClick={() => setEditingSection(section)}
                >
                  <div className="pointer-events-none absolute inset-0 z-10 border-2 border-transparent transition-colors group-hover:border-primary/40" />
                  <div className="pointer-events-none">
                    <SectionRenderer section={section} interactive={false} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <Sheet
        open={editingSection !== null}
        onOpenChange={(next) => !next && setEditingSection(null)}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          {editingSection && (
            <>
              <SheetHeader>
                <SheetTitle>
                  Edit {SECTION_TYPE_LABELS[editingSection.type]}
                </SheetTitle>
                <SheetDescription>
                  Changes go live as soon as you save.
                </SheetDescription>
              </SheetHeader>
              <div className="px-4 pb-6">
                <SectionForm
                  key={editingSection.id}
                  sectionId={editingSection.id}
                  section={editingSection}
                  onSaved={() => setEditingSection(null)}
                />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmDeletePage} onOpenChange={setConfirmDeletePage}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{page.title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              The page, its sections, and its public URL will be permanently
              removed. Captured leads are kept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              onClick={(event) => {
                event.preventDefault();
                startTransition(async () => {
                  const result = await deleteLandingPageAction(page.id);
                  if (result && !result.ok) toast.error(result.error);
                });
              }}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete page
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
