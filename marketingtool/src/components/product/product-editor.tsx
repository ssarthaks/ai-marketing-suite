"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { readAgentFile, saveAgentFile } from "@/app/actions/agents";
import { readSkillFile, saveSkillFile } from "@/app/actions/skills";
import { toast } from "sonner";
import { Loader2, Save, FileText, Eye, AlertTriangle, Sparkles, CheckCircle2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UploadDocumentModal } from "./upload-document-modal";
import { MarkdownContent } from "@/components/markdown-content";

export type FileSelection =
  | { type: "product"; filename: string }
  | {
      type: "skill";
      skillName: string;
      folder: string | null;
      filename: string;
    };

interface ProductEditorProps {
  selectedFile: FileSelection;
  onSaveSuccess?: () => void;
}

export function ProductEditor({
  selectedFile,
  onSaveSuccess,
}: ProductEditorProps) {
  const [content, setContent] = useState<string>("");

  const [activeTab, setActiveTab] = useState<string>("preview");
  const [hasChanges, setHasChanges] = useState<boolean>(false);
  const [initialContent, setInitialContent] = useState<string>("");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [aiUpdateBanner, setAiUpdateBanner] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const { data: fileData, isLoading: loading } = useQuery({
    queryKey: ["file", selectedFile],
    queryFn: async () => {
      if (selectedFile.type === "product") {
        return await readAgentFile(selectedFile.filename);
      } else {
        return await readSkillFile(
          selectedFile.skillName,
          selectedFile.folder,
          selectedFile.filename,
        );
      }
    },
  });

  useEffect(() => {
    if (fileData !== undefined) {
      setContent(fileData);
      setInitialContent(fileData);
      setHasChanges(false);
    }
  }, [fileData]);

  const saveMutation = useMutation({
    mutationFn: async (newContent: string) => {
      if (selectedFile.type === "product") {
        await saveAgentFile(selectedFile.filename, newContent);
      } else {
        await saveSkillFile(
          selectedFile.skillName,
          selectedFile.folder,
          selectedFile.filename,
          newContent,
        );
      }
    },
    onSuccess: () => {
      setInitialContent(content);
      setHasChanges(false);
      setAiUpdateBanner(null);
      toast.success(`Saved successfully.`);
      queryClient.invalidateQueries({ queryKey: ["file"] });
      queryClient.invalidateQueries({ queryKey: ["skills"] });
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      if (onSaveSuccess) onSaveSuccess();
    },
    onError: () => {
      toast.error("Failed to save file changes.");
    },
  });

  const handleContentChange = (val: string) => {
    setContent(val);
    setHasChanges(val !== initialContent);
  };

  const handleSave = async () => {
    saveMutation.mutate(content);
  };

  const handleContextUpdatedFromAI = (newContent: string, message: string) => {
    setContent(newContent);
    setHasChanges(true);
    setAiUpdateBanner(message);
    setActiveTab("preview");
  };

  const saving = saveMutation.isPending;

  const displayTitle =
    selectedFile.type === "product"
      ? selectedFile.filename.replace(/\.md$/, "").replace(/[-_]/g, " ")
      : selectedFile.filename.replace(/\.md$/, "").replace(/[-_]/g, " ");

  const subTitle =
    selectedFile.type === "product"
      ? "Product Marketing Rules"
      : `Skill: ${selectedFile.skillName}${selectedFile.folder ? ` / ${selectedFile.folder}` : ""}`;

  const displayName =
    selectedFile.type === "product"
      ? selectedFile.filename
      : `${selectedFile.skillName}/${selectedFile.folder ? `${selectedFile.folder}/` : ""}${selectedFile.filename}`;

  return (
    <div className="flex flex-col h-full w-full bg-background border border-border rounded-xl shadow-sm overflow-hidden">
      <div className="flex shrink-0 flex-col justify-between gap-3 border-b border-border/60 p-3 sm:p-4 md:flex-row md:items-center md:gap-4 md:p-6">
        <div className="min-w-0">
          <h2 className="flex min-w-0 items-center gap-2 text-lg font-bold capitalize text-foreground sm:text-xl">
            <FileText className="size-5 text-[#6FB941]" />
            <span className="truncate">{displayTitle}</span>
          </h2>
          <p className="text-sm text-muted-foreground mt-1">{subTitle}</p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 md:w-auto md:justify-end md:gap-3">
          {selectedFile.type === "product" && (
            <Button
              onClick={() => setIsUploadModalOpen(true)}
              variant="outline"
              disabled={loading || saving}
              className="min-w-0 flex-1 border-[#6FB941]/40 text-xs font-medium text-foreground hover:border-[#6FB941] sm:flex-none"
            >
              <Sparkles className="size-4 text-[#6FB941]" />
              Upload & AI Update
            </Button>
          )}

          {hasChanges && (
            <div className="flex items-center gap-1.5 text-xs text-amber-500 font-medium bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
              <AlertTriangle className="size-3.5" />
              Unsaved changes
            </div>
          )}
          <Button
            onClick={handleSave}
            disabled={saving || !hasChanges || loading}
            className="min-w-0 flex-1 gap-1.5 bg-[#6FB941] px-4 text-xs font-medium text-white hover:bg-[#6FB941]/90 sm:flex-none"
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-3 sm:p-4 md:p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Loading file contents...
            </p>
          </div>
        ) : (
          <div className="flex flex-col h-full gap-3">
            {aiUpdateBanner && (
              <div className="flex shrink-0 flex-col items-stretch justify-between gap-3 rounded-lg border border-[#6FB941]/30 bg-[#6FB941]/10 p-3 text-xs text-foreground sm:flex-row sm:items-center">
                <div className="flex min-w-0 items-start gap-2 sm:items-center">
                  <CheckCircle2 className="size-4 text-[#6FB941] shrink-0" />
                  <span className="font-medium">{aiUpdateBanner}</span>
                  <span className="text-muted-foreground">— Review the generated context below and click "Save Changes" to apply.</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAiUpdateBanner(null)}
                  className="h-6 text-[11px] text-muted-foreground hover:text-foreground px-2"
                >
                  Dismiss
                </Button>
              </div>
            )}

            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="flex flex-col h-full gap-3"
            >
              <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 pb-1">
                <TabsList className="bg-muted/80 p-0.5 rounded-lg border border-border/40">
                  <TabsTrigger
                    value="edit"
                    className="gap-1.5 py-1.5 px-3 text-xs data-[state=active]:bg-background"
                  >
                    <FileText className="size-3.5" />
                    Editor
                  </TabsTrigger>
                  <TabsTrigger
                    value="preview"
                    className="gap-1.5 py-1.5 px-3 text-xs data-[state=active]:bg-background"
                  >
                    <Eye className="size-3.5" />
                    Preview
                  </TabsTrigger>
                </TabsList>
                <div className="hidden max-w-[50%] truncate font-mono text-xs text-muted-foreground sm:block">
                  {displayName}
                </div>
              </div>

              <TabsContent
                value="edit"
                className="flex-1 overflow-hidden mt-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              >
                <Textarea
                  value={content}
                  onChange={(e) => handleContentChange(e.target.value)}
                  placeholder="Type markdown content here..."
                  className="w-full h-full resize-none font-mono text-[13px] leading-relaxed p-4 border border-border/80 focus-visible:ring-[#6FB941] focus-visible:ring-1 focus-visible:border-[#6FB941] rounded-lg bg-muted/20"
                />
              </TabsContent>

              <TabsContent
                value="preview"
                className="mt-0 flex-1 overflow-y-auto rounded-lg border border-border/60 bg-card/40 p-5 focus-visible:ring-0 focus-visible:ring-offset-0"
              >
                {content.trim() ? (
                  <MarkdownContent content={content} />
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm italic">
                    No content to preview.
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>

      {selectedFile.type === "product" && (
        <UploadDocumentModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          targetFilename={selectedFile.filename}
          onContextUpdated={handleContextUpdatedFromAI}
        />
      )}
    </div>
  );
}
