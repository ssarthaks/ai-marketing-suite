"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageResponse } from "@/components/ai-elements/message";
import { readAgentFile, saveAgentFile } from "@/app/actions/agents";
import { readSkillFile, saveSkillFile } from "@/app/actions/skills";
import { toast } from "sonner";
import {
  Loader2,
  Save,
  FileText,
  Eye,
  AlertTriangle,
  Sparkles,
  UploadCloud,
  CheckCircle2,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UploadDocumentModal } from "./upload-document-modal";

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

  const { data: lastUpdateData } = useQuery({
    queryKey: ["last-update"],
    queryFn: async () => {
      const res = await fetch("/api/last-update");
      return res.json();
    },
    refetchInterval: 10000, // Poll every 10 seconds
  });

  const { data: fileData, isLoading: loading } = useQuery({
    queryKey: ["file", selectedFile, lastUpdateData?.lastUpdate],
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
      queryClient.invalidateQueries({ queryKey: ["last-update"] });
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
      <div className="shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 border-b border-border/60">
        <div>
          <h2 className="text-xl font-bold capitalize flex items-center gap-2 text-foreground">
            <FileText className="size-5 text-[#6FB941]" />
            {displayTitle}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">{subTitle}</p>
        </div>
        <div className="flex items-center gap-3">
          {selectedFile.type === "product" && (
            <Button
              onClick={() => setIsUploadModalOpen(true)}
              variant="outline"
              disabled={loading || saving}
              className="border-[#6FB941]/40 hover:border-[#6FB941] text-foreground font-medium gap-2 text-xs"
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
            className="bg-[#6FB941] hover:bg-[#6FB941]/90 text-white font-medium gap-1.5 text-xs px-4"
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

      <div className="flex-1 overflow-hidden p-6">
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
              <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-[#6FB941]/10 border border-[#6FB941]/30 text-xs text-foreground shrink-0">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-[#6FB941] shrink-0" />
                  <span className="font-medium">{aiUpdateBanner}</span>
                  <span className="text-muted-foreground">
                    — Review the generated context below and click "Save
                    Changes" to apply.
                  </span>
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
              <div className="flex justify-between items-center shrink-0 pb-1">
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
                <div className="text-xs text-muted-foreground font-mono truncate max-w-[50%]">
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
                className="flex-1 overflow-y-auto mt-0 border border-border/60 rounded-lg p-5 bg-card/40 focus-visible:ring-0 focus-visible:ring-offset-0"
              >
                {content.trim() ? (
                  <div className="max-w-none text-foreground">
                    <MessageResponse isAnimating={false}>
                      {content}
                    </MessageResponse>
                  </div>
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
