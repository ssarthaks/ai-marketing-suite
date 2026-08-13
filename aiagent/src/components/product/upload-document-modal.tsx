"use client";

import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { updateProductContextWithDocument } from "@/app/actions/agents";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils";
import {
  UploadCloud,
  FileText,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  FileCode,
  Zap,
  RefreshCw,
} from "lucide-react";

interface UploadDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetFilename: string; // e.g. "demo-saas/product.md"
  onContextUpdated: (newMarkdownContent: string, message: string) => void;
}

export function UploadDocumentModal({
  isOpen,
  onClose,
  targetFilename,
  onContextUpdated,
}: UploadDocumentModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<"smart_merge" | "replace">("smart_merge");
  const [customInstructions, setCustomInstructions] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleReset = () => {
    setFile(null);
    setMode("smart_merge");
    setCustomInstructions("");
    setIsProcessing(false);
    setStatusMessage("");
  };

  const handleClose = () => {
    if (!isProcessing) {
      handleReset();
      onClose();
    }
  };

  const handleFileSelect = (selectedFile: File) => {
    const validExts = ["pdf", "docx", "doc", "txt", "md", "csv", "json"];
    const ext = selectedFile.name.split(".").pop()?.toLowerCase() || "";

    if (!validExts.includes(ext)) {
      toast.error(
        `Unsupported file type (.${ext}). Please upload PDF, DOCX, TXT, MD, CSV, or JSON files.`,
      );
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error("File size exceeds 10MB limit.");
      return;
    }

    setFile(selectedFile);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      toast.error("Please select a document file to upload.");
      return;
    }

    try {
      setIsProcessing(true);
      setStatusMessage("Reading document buffer...");

      // Convert file to Base64
      const arrayBuffer = await file.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");

      setStatusMessage("Parsing text & invoking DeepSeek AI...");

      const result = await updateProductContextWithDocument({
        filename: targetFilename,
        fileBase64: base64,
        originalFilename: file.name,
        mode,
        customInstructions: customInstructions.trim(),
      });

      if (result.success && result.updatedContent) {
        toast.success(
          `Product context updated via DeepSeek AI! (${result.extractedFileType} extracted, ${result.parsedCharCount} chars)`,
        );
        onContextUpdated(
          result.updatedContent,
          `Updated from ${file.name} using DeepSeek AI (${mode === "smart_merge" ? "Smart Merge" : "Fresh Regeneration"})`,
        );
        handleReset();
        onClose();
      } else {
        throw new Error("Failed to parse document context.");
      }
    } catch (error: unknown) {
      toast.error(
        getErrorMessage(error, "Failed to update context with document."),
      );
    } finally {
      setIsProcessing(false);
      setStatusMessage("");
    }
  };

  const productName = targetFilename
    .replace(/\.md$/, "")
    .split("/")
    .join(" / ")
    .replace(/[-_]/g, " ");

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl bg-background border border-border shadow-2xl rounded-2xl p-6 sm:p-7">
        <DialogHeader className="gap-1.5 pb-3 border-b border-border/60">
          <DialogTitle className="text-xl font-bold flex items-center gap-2.5 text-foreground">
            <div className="size-9 rounded-xl bg-[#6FB941]/10 border border-[#6FB941]/20 flex items-center justify-center text-[#6FB941]">
              <Sparkles className="size-5" />
            </div>
            AI Document Context Updater
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Upload an updated product document (PDF, DOCX, TXT, MD) and let
            DeepSeek AI parse and synthesize it into your product context
            markdown file.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5 py-3">
          {/* Target File Badge */}
          <div className="flex items-center justify-between bg-muted/40 px-3.5 py-2 rounded-lg border border-border/60 text-xs">
            <span className="text-muted-foreground font-medium">
              Target Context File:
            </span>
            <span className="font-mono text-[#6FB941] font-semibold flex items-center gap-1.5">
              <FileCode className="size-3.5" />
              {targetFilename}
            </span>
          </div>

          {/* File Drag and Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !file && fileInputRef.current?.click()}
            className={`relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl transition-all duration-200 ${
              file
                ? "border-[#6FB941] bg-[#6FB941]/5"
                : isDragging
                  ? "border-[#6FB941] bg-[#6FB941]/10 scale-[1.01]"
                  : "border-border/80 bg-muted/20 hover:bg-muted/40 hover:border-muted-foreground/40 cursor-pointer"
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) =>
                e.target.files?.[0] && handleFileSelect(e.target.files[0])
              }
              accept=".pdf,.docx,.doc,.txt,.md,.csv,.json"
              className="hidden"
              disabled={isProcessing}
            />

            {file ? (
              <div className="flex items-center justify-between w-full gap-3 bg-background border border-border p-3.5 rounded-lg shadow-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-10 rounded-lg bg-[#6FB941]/15 text-[#6FB941] flex items-center justify-center shrink-0">
                    <FileText className="size-5" />
                  </div>
                  <div className="min-w-0 flex flex-col">
                    <span className="text-sm font-semibold text-foreground truncate">
                      {file.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB •{" "}
                      {file.name.split(".").pop()?.toUpperCase()} Document
                    </span>
                  </div>
                </div>
                {!isProcessing && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                    className="size-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md"
                  >
                    <X className="size-4" />
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center text-center gap-2">
                <div className="size-12 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground">
                  <UploadCloud className="size-6 text-[#6FB941]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Click to upload or drag & drop document
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Supports PDF, DOCX, DOC, TXT, MD, CSV, JSON (max 10MB)
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Mode Selection */}
          <div className="flex flex-col gap-2">
            <Label className="text-xs font-semibold text-foreground">
              Update Mode
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setMode("smart_merge")}
                className={`flex items-start gap-3 p-3 rounded-xl border text-left cursor-pointer transition-all ${
                  mode === "smart_merge"
                    ? "border-[#6FB941] bg-[#6FB941]/10 text-foreground ring-1 ring-[#6FB941]"
                    : "border-border/60 bg-muted/10 hover:bg-muted/30 text-muted-foreground"
                }`}
              >
                <div
                  className={`size-4 rounded-full border flex items-center justify-center mt-0.5 shrink-0 ${mode === "smart_merge" ? "border-[#6FB941] bg-[#6FB941]" : "border-muted-foreground"}`}
                >
                  {mode === "smart_merge" && (
                    <div className="size-1.5 rounded-full bg-white" />
                  )}
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                    <Zap className="size-3.5 text-[#6FB941]" />
                    Smart Merge (Recommended)
                  </span>
                  <span className="text-[11px] text-muted-foreground leading-tight">
                    Combines new document details with existing context while
                    preserving valid sections.
                  </span>
                </div>
              </button>

              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setMode("replace")}
                className={`flex items-start gap-3 p-3 rounded-xl border text-left cursor-pointer transition-all ${
                  mode === "replace"
                    ? "border-[#6FB941] bg-[#6FB941]/10 text-foreground ring-1 ring-[#6FB941]"
                    : "border-border/60 bg-muted/10 hover:bg-muted/30 text-muted-foreground"
                }`}
              >
                <div
                  className={`size-4 rounded-full border flex items-center justify-center mt-0.5 shrink-0 ${mode === "replace" ? "border-[#6FB941] bg-[#6FB941]" : "border-muted-foreground"}`}
                >
                  {mode === "replace" && (
                    <div className="size-1.5 rounded-full bg-white" />
                  )}
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                    <RefreshCw className="size-3.5 text-amber-500" />
                    Fresh Regeneration
                  </span>
                  <span className="text-[11px] text-muted-foreground leading-tight">
                    Re-creates the context document strictly using the uploaded
                    file as source of truth.
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Optional Instructions */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>Optional Instructions for DeepSeek AI</span>
              <span className="text-[11px] font-normal text-muted-foreground">
                Optional
              </span>
            </Label>
            <Textarea
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              placeholder="e.g., Focus on new Q3 pricing updates, enterprise tier features, and new onboarding flows."
              rows={2}
              className="resize-none text-xs bg-muted/20 border-border/80 focus-visible:ring-[#6FB941]"
              disabled={isProcessing}
            />
          </div>

          {/* Status Message during processing */}
          {isProcessing && (
            <div className="flex items-center gap-3 p-3 bg-muted/50 border border-border/80 rounded-xl text-xs text-foreground animate-pulse">
              <Loader2 className="size-4 animate-spin text-[#6FB941]" />
              <span>
                {statusMessage || "Processing document with DeepSeek AI..."}
              </span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 pt-3 border-t border-border/60">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isProcessing}
            className="text-xs font-medium"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!file || isProcessing}
            className="bg-[#6FB941] hover:bg-[#6FB941]/90 text-white font-medium text-xs gap-2 px-5"
          >
            {isProcessing ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Parsing with AI...
              </>
            ) : (
              <>
                <Sparkles className="size-4" />
                Process Document with DeepSeek
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
