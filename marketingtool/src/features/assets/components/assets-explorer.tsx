"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  FileText,
  Film,
  Folder,
  LayoutGrid,
  List,
  MoreHorizontal,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { CopyButton } from "@/components/copy-button";
import { VisibilityBadge } from "@/components/visibility-badge";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { formatBytes, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { deleteAssetAction } from "@/features/assets/actions/asset.actions";
import type { AssetDTO } from "@/features/assets/types";

const ALL = "__all__";

function AssetThumb({
  asset,
  className,
  sizes,
}: {
  asset: AssetDTO;
  className?: string;
  sizes: string;
}) {
  if (asset.type === "IMAGE") {
    return (
      <Image
        src={asset.url}
        alt={asset.name}
        fill
        sizes={sizes}
        className={cn("object-cover", className)}
      />
    );
  }
  const Icon = asset.type === "VIDEO" ? Film : FileText;
  return (
    <div className="flex h-full w-full items-center justify-center bg-muted/50">
      <Icon className="size-7 text-muted-foreground" />
    </div>
  );
}

export function AssetsExplorer({
  assets,
  folders,
}: {
  assets: AssetDTO[];
  folders: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [view, setView] = useState<"grid" | "list">("grid");
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [preview, setPreview] = useState<AssetDTO | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AssetDTO | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();
  const debouncedQuery = useDebouncedValue(query, 300);

  const folderParam = searchParams.get("folder") ?? ALL;
  const typeParam = searchParams.get("type") ?? ALL;

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

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === ALL) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    const next = params.toString();
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
  }

  function onDelete() {
    if (!pendingDelete) return;
    startDeleteTransition(async () => {
      const result = await deleteAssetAction(pendingDelete.id);
      if (result.ok) {
        toast.success(`Deleted ${pendingDelete.name}`);
        setPendingDelete(null);
        setPreview(null);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative w-full min-w-0 flex-1 sm:min-w-52">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search assets…"
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
          value={folderParam}
          onValueChange={(value) => setParam("folder", value)}
        >
          <SelectTrigger className="w-full sm:w-44">
            <Folder className="size-4 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All folders</SelectItem>
            {folders.map((folder) => (
              <SelectItem key={folder} value={folder}>
                {folder}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={typeParam}
          onValueChange={(value) => setParam("type", value)}
        >
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All types</SelectItem>
            <SelectItem value="IMAGE">Images</SelectItem>
            <SelectItem value="VIDEO">Videos</SelectItem>
            <SelectItem value="PDF">PDFs</SelectItem>
            <SelectItem value="OTHER">Other</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex self-end rounded-lg border p-0.5 sm:self-auto">
          <Button
            variant={view === "grid" ? "secondary" : "ghost"}
            size="icon"
            className="size-7"
            onClick={() => setView("grid")}
            aria-label="Grid view"
          >
            <LayoutGrid className="size-4" />
          </Button>
          <Button
            variant={view === "list" ? "secondary" : "ghost"}
            size="icon"
            className="size-7"
            onClick={() => setView("list")}
            aria-label="List view"
          >
            <List className="size-4" />
          </Button>
        </div>
      </div>

      {view === "grid" ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {assets.map((asset) => (
            <div
              key={asset.id}
              className="group overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md"
            >
              <button
                type="button"
                onClick={() => setPreview(asset)}
                className="relative block aspect-square w-full overflow-hidden"
              >
                <AssetThumb
                  asset={asset}
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 240px"
                  className="transition-transform duration-300 group-hover:scale-105"
                />
              </button>
              <div className="flex items-center gap-1 p-2.5">
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="truncate text-xs font-medium">{asset.name}</p>
                  <div className="flex items-center justify-between gap-1 flex-wrap">
                    <p className="text-[11px] text-muted-foreground">
                      {formatBytes(asset.size)}
                    </p>
                    <VisibilityBadge
                      visibility={asset.visibility}
                      sharedCount={asset.sharedWithUserIds?.length || 0}
                      createdByName={asset.uploadedBy?.name || asset.uploadedBy?.email}
                    />
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100"
                      aria-label="Asset actions"
                    >
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => setPreview(asset)}>
                      Preview
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => {
                        navigator.clipboard.writeText(asset.url);
                        toast.success("URL copied");
                      }}
                    >
                      Copy URL
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={() => setPendingDelete(asset)}
                    >
                      <Trash2 />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">Name</th>
                <th className="hidden px-4 py-2.5 font-medium sm:table-cell">
                  Folder
                </th>
                <th className="px-4 py-2.5 font-medium">Type</th>
                <th className="hidden px-4 py-2.5 font-medium md:table-cell">
                  Size
                </th>
                <th className="hidden px-4 py-2.5 font-medium lg:table-cell">
                  Uploaded
                </th>
                <th className="w-10 px-2 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {assets.map((asset) => (
                <tr
                  key={asset.id}
                  className="cursor-pointer transition-colors hover:bg-muted/40"
                  onClick={() => setPreview(asset)}
                >
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <div className="relative size-9 shrink-0 overflow-hidden rounded-md border">
                        <AssetThumb asset={asset} sizes="36px" />
                      </div>
                      <span className="max-w-64 truncate font-medium">
                        {asset.name}
                      </span>
                    </div>
                  </td>
                  <td className="hidden px-4 py-2.5 text-muted-foreground sm:table-cell">
                    {asset.folder}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge variant="secondary">{asset.type}</Badge>
                  </td>
                  <td className="hidden px-4 py-2.5 text-muted-foreground md:table-cell">
                    {formatBytes(asset.size)}
                  </td>
                  <td className="hidden px-4 py-2.5 text-muted-foreground lg:table-cell">
                    {formatDate(asset.createdAt)}
                  </td>
                  <td
                    className="px-2 py-2.5"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          aria-label="Asset actions"
                        >
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => setPreview(asset)}>
                          Preview
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => {
                            navigator.clipboard.writeText(asset.url);
                            toast.success("URL copied");
                          }}
                        >
                          Copy URL
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={() => setPendingDelete(asset)}
                        >
                          <Trash2 />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog
        open={preview !== null}
        onOpenChange={(next) => !next && setPreview(null)}
      >
        <DialogContent className="sm:max-w-2xl max-w-[calc(100%-2rem)] min-w-0 overflow-hidden">
          {preview && (
            <>
              <DialogHeader className="min-w-0 max-w-full overflow-hidden pr-6">
                <DialogTitle className="min-w-0 max-w-full truncate break-all text-base font-semibold sm:text-lg">
                  {preview.name}
                </DialogTitle>
                <DialogDescription className="truncate">
                  {preview.folder} · {formatBytes(preview.size)} ·{" "}
                  {formatDate(preview.createdAt)}
                </DialogDescription>
              </DialogHeader>
              <div className="relative flex max-h-[60vh] min-h-[200px] w-full items-center justify-center overflow-hidden rounded-lg border bg-muted/20 p-2">
                {preview.type === "IMAGE" ? (
                  <div className="relative flex h-full max-h-[50vh] w-full items-center justify-center">
                    <img
                      src={preview.url}
                      alt={preview.name}
                      className="max-h-[50vh] w-auto max-w-full rounded-md object-contain shadow-xs"
                    />
                  </div>
                ) : preview.type === "VIDEO" ? (
                  <video
                    src={preview.url}
                    controls
                    className="max-h-[50vh] w-full rounded-md object-contain"
                  />
                ) : (
                  <div className="flex aspect-video flex-col items-center justify-center gap-3">
                    <FileText className="size-10 text-muted-foreground" />
                    <Button asChild variant="outline" size="sm">
                      <a
                        href={preview.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Open file
                      </a>
                    </Button>
                  </div>
                )}
              </div>
              <DialogFooter className="mt-2 flex flex-row items-center justify-between gap-2 sm:justify-between">
                <CopyButton value={preview.url} label="Copy URL" />
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setPendingDelete(preview)}
                >
                  <Trash2 className="size-4" />
                  Delete
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(next) => !next && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete “{pendingDelete?.name}”?
            </AlertDialogTitle>
            <AlertDialogDescription>
              The file will be removed from Cloudinary and from your library.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={(event) => {
                event.preventDefault();
                onDelete();
              }}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete asset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
