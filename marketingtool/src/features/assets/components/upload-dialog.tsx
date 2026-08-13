"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  CloudUpload,
  File,
  FileText,
  Film,
  Loader2,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatBytes } from "@/lib/format";
import {
  createUploadSignatureAction,
  saveAssetAction,
} from "@/features/assets/actions/asset.actions";
import {
  VisibilitySelector,
  type UserOption,
  type VisibilityStatus,
} from "@/components/visibility-selector";

const NO_CAMPAIGN = "__none__";
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

const ACCEPTED_TYPES = "image/*,video/*,application/pdf";

interface CloudinaryUploadResponse {
  public_id: string;
  secure_url: string;
  bytes: number;
  width?: number;
  height?: number;
  format?: string;
}

interface UploadItem {
  file: File;
  previewUrl?: string;
  progress: number;
  status: "queued" | "uploading" | "saving" | "done" | "error";
  error?: string;
}

interface UploadDialogProps {
  campaigns: { id: string; title: string }[];
  folders: string[];
  users?: UserOption[];
}

function uploadToCloudinary(
  file: File,
  signature: {
    cloudName: string;
    apiKey: string;
    timestamp: number;
    signature: string;
    folder: string;
    publicId: string;
  },
  onProgress: (percent: number) => void
): Promise<CloudinaryUploadResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const form = new FormData();
    form.append("file", file);
    form.append("api_key", signature.apiKey);
    form.append("timestamp", String(signature.timestamp));
    form.append("signature", signature.signature);
    form.append("folder", signature.folder);
    form.append("public_id", signature.publicId);
    form.append("overwrite", "false");

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    });
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText) as CloudinaryUploadResponse);
      } else {
        reject(new Error(`Upload failed (${xhr.status})`));
      }
    });
    xhr.addEventListener("error", () => reject(new Error("Network error")));
    xhr.open(
      "POST",
      `https://api.cloudinary.com/v1_1/${signature.cloudName}/auto/upload`
    );
    xhr.send(form);
  });
}

export function UploadDialog({
  campaigns,
  folders,
  users = [],
}: UploadDialogProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<UploadItem[]>([]);
  const [folder, setFolder] = useState("/");
  const [campaignId, setCampaignId] = useState(NO_CAMPAIGN);
  const [visibility, setVisibility] = useState<VisibilityStatus>("PUBLIC");
  const [sharedWithUserIds, setSharedWithUserIds] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  function updateItem(index: number, patch: Partial<UploadItem>) {
    setItems((current) =>
      current.map((item, i) => (i === index ? { ...item, ...patch } : item))
    );
  }

  function removeItem(indexToRemove: number) {
    setItems((current) => {
      const item = current[indexToRemove];
      if (item?.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
      return current.filter((_, i) => i !== indexToRemove);
    });
  }

  function clearItems() {
    setItems((current) => {
      current.forEach((item) => {
        if (item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
        }
      });
      return [];
    });
  }

  function onFilesSelected(fileList: FileList | null) {
    if (!fileList) return;
    const newItems: UploadItem[] = [];
    for (const file of Array.from(fileList)) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} is larger than 100 MB`);
        continue;
      }
      const previewUrl = file.type.startsWith("image/")
        ? URL.createObjectURL(file)
        : undefined;
      newItems.push({ file, previewUrl, progress: 0, status: "queued" });
    }
    setItems((current) => [...current, ...newItems]);
  }

  async function onUpload() {
    if (items.length === 0) return;
    const normalizedFolder = folder.trim() === "" ? "/" : folder.trim();

    setIsUploading(true);
    let succeeded = 0;
    for (let index = 0; index < items.length; index++) {
      const item = items[index];
      if (item.status === "done") continue;
      try {
        const signatureResult = await createUploadSignatureAction();
        if (!signatureResult.ok) {
          updateItem(index, {
            status: "error",
            error: signatureResult.error,
          });
          continue;
        }
        updateItem(index, { status: "uploading", progress: 0 });
        const uploaded = await uploadToCloudinary(
          item.file,
          signatureResult.data,
          (p) => updateItem(index, { progress: p }),
        );
        updateItem(index, { status: "saving" });
        const saved = await saveAssetAction({
          name: item.file.name,
          folder: normalizedFolder,
          campaignId: campaignId === NO_CAMPAIGN ? undefined : campaignId,
          publicId: uploaded.public_id,
          url: uploaded.secure_url,
          mimeType: item.file.type || "application/octet-stream",
          size: uploaded.bytes,
          width: uploaded.width,
          height: uploaded.height,
          format: uploaded.format,
          visibility,
          sharedWithUserIds,
        });
        if (saved.ok) {
          succeeded += 1;
          updateItem(index, { status: "done", progress: 100 });
        } else {
          updateItem(index, { status: "error", error: saved.error });
        }
      } catch (error) {
        updateItem(index, {
          status: "error",
          error: error instanceof Error ? error.message : "Upload failed",
        });
      }
    }

    setIsUploading(false);
    if (succeeded > 0) {
      toast.success(
        succeeded === 1 ? "1 file uploaded" : `${succeeded} files uploaded`
      );
      router.refresh();
    }
  }

  function onOpenChange(next: boolean) {
    if (isUploading) return;
    setOpen(next);
    if (!next) {
      clearItems();
      setFolder("/");
      setCampaignId(NO_CAMPAIGN);
    }
  }

  const allDone =
    items.length > 0 && items.every((item) => item.status === "done");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <CloudUpload className="size-4" />
          Upload
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg min-w-0 max-w-[calc(100%-2rem)] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Upload assets</DialogTitle>
          <DialogDescription>
            Images, videos, and PDFs up to 100 MB each.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 min-w-0 max-w-full overflow-hidden">
          {/* Dropzone */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-6 py-8 text-center transition-colors hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <CloudUpload className="size-8 text-muted-foreground" />
            <span className="text-sm font-medium">
              {items.length > 0
                ? `${items.length} file${items.length === 1 ? "" : "s"} selected`
                : "Click to choose files"}
            </span>
            <span className="text-xs text-muted-foreground">
              or drop them on this area
            </span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPTED_TYPES}
            className="hidden"
            onChange={(event) => {
              onFilesSelected(event.target.files);
              // Reset input so re-selecting same file works
              event.target.value = "";
            }}
          />

          {/* Selected Files Preview List */}
          {items.length > 0 && (
            <div className="space-y-2 min-w-0 w-full overflow-hidden">
              <div className="flex items-center justify-between text-xs text-muted-foreground font-medium px-0.5">
                <span>Selected items ({items.length})</span>
                {!isUploading && (
                  <button
                    type="button"
                    onClick={clearItems}
                    className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                  >
                    Clear all
                  </button>
                )}
              </div>

              <ul className="max-h-56 space-y-2 overflow-y-auto pr-1">
                {items.map((item, index) => (
                  <li
                    key={`${item.file.name}-${index}`}
                    className="flex items-center gap-3 rounded-lg border bg-card p-2.5 min-w-0 max-w-full overflow-hidden"
                  >
                    {/* Thumbnail Preview */}
                    <div className="relative size-12 shrink-0 overflow-hidden rounded-md border bg-muted flex items-center justify-center">
                      {item.previewUrl ? (
                        <img
                          src={item.previewUrl}
                          alt={item.file.name}
                          className="h-full w-full object-cover"
                        />
                      ) : item.file.type.startsWith("video/") ? (
                        <Film className="size-5 text-muted-foreground" />
                      ) : item.file.type === "application/pdf" ? (
                        <FileText className="size-5 text-muted-foreground" />
                      ) : (
                        <File className="size-5 text-muted-foreground" />
                      )}
                    </div>

                    {/* File Details */}
                    <div className="min-w-0 flex-1 space-y-1 overflow-hidden">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">
                          {item.file.name}
                        </span>
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {formatBytes(item.file.size)}
                        </span>
                      </div>

                      {/* Progress / Status */}
                      <div className="flex items-center gap-2">
                        {(item.status === "uploading" || item.status === "saving") && (
                          <div className="flex-1 space-y-1 min-w-0">
                            <Progress value={item.progress} className="h-1.5" />
                            <span className="text-[10px] text-muted-foreground">
                              {item.status === "uploading"
                                ? `Uploading ${item.progress}%`
                                : "Saving asset…"}
                            </span>
                          </div>
                        )}
                        {item.status === "done" && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-500">
                            <CheckCircle2 className="size-3.5" /> Ready
                          </span>
                        )}
                        {item.status === "error" && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-destructive">
                            <XCircle className="size-3.5" /> Failed
                          </span>
                        )}
                        {item.status === "queued" && (
                          <span className="text-[11px] text-muted-foreground">
                            Ready to upload
                          </span>
                        )}
                      </div>

                      {item.error && (
                        <p className="truncate text-[11px] text-destructive">
                          {item.error}
                        </p>
                      )}
                    </div>

                    {/* Remove button */}
                    {!isUploading && item.status !== "done" && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-destructive transition-colors shrink-0"
                        title="Remove file"
                      >
                        <X className="size-4" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Settings Grid */}
          <div className="grid gap-4 sm:grid-cols-2 min-w-0 max-w-full">
            <div className="space-y-2 min-w-0">
              <Label htmlFor="upload-folder">Folder</Label>
              <Input
                id="upload-folder"
                list="upload-folder-options"
                value={folder}
                disabled={isUploading}
                onChange={(event) => setFolder(event.target.value)}
                placeholder="/brand/logos"
              />
              <datalist id="upload-folder-options">
                {folders.map((existing) => (
                  <option key={existing} value={existing} />
                ))}
              </datalist>
            </div>
            <div className="space-y-2 min-w-0">
              <Label>Campaign</Label>
              <Select
                value={campaignId}
                onValueChange={setCampaignId}
                disabled={isUploading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_CAMPAIGN}>No campaign</SelectItem>
                  {campaigns.map((campaign) => (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      {campaign.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <VisibilitySelector
            visibility={visibility}
            sharedWithUserIds={sharedWithUserIds}
            onChangeVisibility={setVisibility}
            onChangeSharedWithUserIds={setSharedWithUserIds}
            users={users}
            disabled={isUploading}
          />
        </div>

        <DialogFooter className="mt-2">
          {allDone ? (
            <Button onClick={() => onOpenChange(false)}>Done</Button>
          ) : (
            <Button
              onClick={onUpload}
              disabled={items.length === 0 || isUploading}
            >
              {isUploading && <Loader2 className="size-4 animate-spin" />}
              {isUploading
                ? "Uploading…"
                : `Upload ${items.length > 0 ? items.length : ""} file${items.length === 1 ? "" : "s"}`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
