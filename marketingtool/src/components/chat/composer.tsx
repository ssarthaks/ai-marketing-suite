import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowUp, Paperclip, Sparkles, Square, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { newId, type ChatAttachment } from "@/lib/threads";

interface Props {
  onSubmit: (text: string, attachments: ChatAttachment[]) => void;
  onStop?: () => void;
  status: "idle" | "submitted" | "streaming";
  autoFocusKey?: string;
  placeholder?: string;
  modelLabel?: string;
  modelOptions?: Array<{ id: string; label: string }>;
  activeModelId?: string;
  onModelChange?: (modelId: string) => void;
  hoveredPrompt?: string | null;
}

export function Composer({
  onSubmit,
  onStop,
  status,
  autoFocusKey,
  placeholder = "Ask AiAgent anything...",
  modelLabel = "Gemini 1.5 Flash",
  modelOptions,
  activeModelId,
  onModelChange,
  hoveredPrompt,
}: Props) {
  const [value, setValue] = useState("");
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<File[]>([]);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Truncate the hovered prompt to approximately 2 lines of text
  const displayPlaceholder = hoveredPrompt
    ? hoveredPrompt.length > 140
      ? hoveredPrompt.slice(0, 195).trim() + "..."
      : hoveredPrompt
    : placeholder;

  const isBusy = status !== "idle" || isUploading;

  useEffect(() => {
    taRef.current?.focus();
  }, [autoFocusKey]);

  useEffect(() => {
    if (status === "idle") taRef.current?.focus();
  }, [status]);

  const autoResize = () => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = Math.min(el.scrollHeight, 220) + "px";
  };

  useEffect(() => {
    autoResize();
  }, [value, hoveredPrompt]);

  const submit = () => {
    const text = value.trim();
    if ((!text && attachments.length === 0) || isBusy) return;
    onSubmit(text, attachments);
    setValue("");
    setAttachments([]);
    if (fileRef.current) fileRef.current.value = "";
  };

  const readAsDataUrl = (file: File) =>
    new Promise<string | undefined>((resolve) => {
      const reader = new FileReader();
      reader.onload = () =>
        resolve(typeof reader.result === "string" ? reader.result : undefined);
      reader.onerror = () => resolve(undefined);
      reader.readAsDataURL(file);
    });

  const handlePickFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      let hasFiles = false;
      const validFiles: File[] = [];

      for (const file of Array.from(files)) {
        if (file.size > 25 * 1024 * 1024) {
          toast.error(`File ${file.name} exceeds the 25MB limit.`);
          continue;
        }
        formData.append("file", file);
        hasFiles = true;
        validFiles.push(file);
      }

      if (!hasFiles) {
        setIsUploading(false);
        return;
      }

      setUploadingFiles(validFiles);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Upload failed");
      }

      const data = await res.json();
      const uploadedAttachments: ChatAttachment[] = data.results.map(
        (r: any) => ({
          id: newId(),
          name: r.name,
          type: r.type,
          size: r.size,
          url: r.url,
          previewUrl: r.type.startsWith("image/") ? r.url : undefined,
          textContent: r.textContent,
        }),
      );

      setAttachments((current) => [...current, ...uploadedAttachments]);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsUploading(false);
      setUploadingFiles([]);
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments((current) => current.filter((item) => item.id !== id));
  };

  const formatBytes = (size: number) => {
    if (size < 1024) return `${size} B`;
    const kb = size / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-6 pt-2">
      <div
        className={cn(
          "group relative flex flex-col rounded-3xl border border-[#6FB941]/50 bg-card shadow-[0_8px_24px_-14px_rgba(111,185,65,0.25),0_4px_12px_-8px_rgba(34,197,94,0.18)]",
          "transition-all focus-within:border-[#6FB941]/70 focus-within:shadow-[0_12px_32px_-16px_rgba(111,185,65,0.35),0_6px_18px_-10px_rgba(34,197,94,0.25)]",
        )}
      >
        {(attachments.length > 0 || uploadingFiles.length > 0) && (
          <div className="flex flex-wrap gap-2 px-4 pt-4">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center gap-2 rounded-full border border-border bg-muted/70 px-3 py-1 text-xs text-muted-foreground"
              >
                {attachment.previewUrl &&
                  attachment.type.startsWith("image/") && (
                    <img
                      src={attachment.previewUrl}
                      alt={attachment.name}
                      className="size-7 rounded-md object-cover"
                      loading="lazy"
                    />
                  )}
                <span className="max-w-45 truncate">{attachment.name}</span>
                <span className="text-[10px] text-muted-foreground/70">
                  {formatBytes(attachment.size)}
                </span>
                <button
                  type="button"
                  onClick={() => removeAttachment(attachment.id)}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label={`Remove ${attachment.name}`}
                >
                  ×
                </button>
              </div>
            ))}
            {uploadingFiles.map((file, i) => (
              <div
                key={`uploading-${i}`}
                className="flex items-center gap-2 rounded-full border border-border bg-muted/70 px-3 py-1 text-xs text-muted-foreground animate-pulse"
              >
                <Loader2 className="size-3 animate-spin" />
                <span className="max-w-45 truncate">{file.name}</span>
                <span className="text-[10px] text-muted-foreground/70">
                  Uploading...
                </span>
              </div>
            ))}
          </div>
        )}
        <textarea
          ref={taRef}
          rows={2}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={displayPlaceholder}
          className="block min-h-[75px] w-full resize-none bg-transparent px-5 pb-2 pt-4 text-[15px] leading-6 placeholder:text-muted-foreground/70 focus:outline-none transition-all duration-200"
        />
        <div className="flex w-full items-center justify-between gap-2 px-4 pb-3 pt-1">
          <div className="flex items-center gap-1 min-w-0">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground"
              aria-label="Attach file"
              title="Attach file"
              onClick={() => fileRef.current?.click()}
            >
              <Paperclip className="size-4" />
            </Button>
            <input
              ref={fileRef}
              type="file"
              multiple
              className="hidden"
              onChange={(event) => handlePickFiles(event.target.files)}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 rounded-full px-2 text-xs text-muted-foreground max-w-[150px] sm:max-w-[200px] md:max-w-none"
                  title="Select model"
                >
                  <Sparkles className="size-3.5 shrink-0" />
                  <span className="truncate">{modelLabel}</span>
                </Button>
              </DropdownMenuTrigger>
              {modelOptions && modelOptions.length > 0 && (
                <DropdownMenuContent align="start">
                  {modelOptions.map((option) => (
                    <DropdownMenuItem
                      key={option.id}
                      onSelect={() => onModelChange?.(option.id)}
                    >
                      {option.label}
                      {activeModelId === option.id ? " ✓" : ""}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              )}
            </DropdownMenu>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden text-[11px] text-muted-foreground sm:inline">
              <kbd className="rounded border border-border bg-muted/60 px-1.5 py-0.5 font-mono text-[10px]">
                Enter
              </kbd>{" "}
              to send
            </span>
            {isBusy ? (
              <Button
                type="button"
                size="icon-sm"
                onClick={onStop}
                className="size-8 rounded-full"
                aria-label="Stop"
              >
                <Square className="size-3.5 fill-current" />
              </Button>
            ) : (
              <Button
                type="button"
                size="icon-sm"
                onClick={submit}
                disabled={!value.trim() && attachments.length === 0}
                aria-label="Send"
                className={cn(
                  "size-8 rounded-full transition-all",
                  value.trim() || attachments.length > 0
                    ? "bg-[#6FB941] text-white hover:bg-[#6FB941]/90"
                    : "bg-muted text-muted-foreground",
                )}
              >
                <ArrowUp className="size-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
      <p className="mt-4 text-center text-[11px] text-muted-foreground">
        AiAgent can make mistakes. Live responses use the server-side model API
        keys.
      </p>
    </div>
  );
}
