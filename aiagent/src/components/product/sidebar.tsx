"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn, getErrorMessage } from "@/lib/utils";
import {
  FileText,
  ChevronDown,
  ChevronRight,
  Plus,
  Folder,
  Cpu,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  listSkills,
  SkillTree,
  createSkill,
  createSkillFile,
} from "@/app/actions/skills";
import { listAgentFiles, createAgentProduct } from "@/app/actions/agents";
import { FileSelection } from "./product-editor";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface ProductSidebarProps {
  productFilename: string;
  selectedFile: FileSelection;
  onSelectFile: (file: FileSelection) => void;
}

export function ProductSidebar({
  productFilename,
  selectedFile,
  onSelectFile,
}: ProductSidebarProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [expandedSkills, setExpandedSkills] = useState<Set<string>>(new Set());
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(),
  );

  // Modal states
  const [isSkillModalOpen, setIsSkillModalOpen] = useState(false);
  const [skillNameInput, setSkillNameInput] = useState("");

  const [isFileModalOpen, setIsFileModalOpen] = useState(false);
  const [fileModalData, setFileModalData] = useState<{
    skillName: string;
    folder: "references" | "evals";
  } | null>(null);
  const [fileNameInput, setFileNameInput] = useState("");

  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productNameInput, setProductNameInput] = useState("");

  const { data: lastUpdateData } = useQuery({
    queryKey: ["last-update"],
    queryFn: async () => {
      const res = await fetch("/api/last-update");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: skills = [] } = useQuery({
    queryKey: ["skills", lastUpdateData?.lastUpdate],
    queryFn: async () => await listSkills(),
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products", lastUpdateData?.lastUpdate],
    queryFn: async () => await listAgentFiles(),
  });

  const toggleSkill = (skillName: string) => {
    const next = new Set(expandedSkills);
    if (next.has(skillName)) {
      next.delete(skillName);
    } else {
      next.add(skillName);
    }
    setExpandedSkills(next);
  };

  const toggleFolder = (folderKey: string) => {
    const next = new Set(expandedFolders);
    if (next.has(folderKey)) {
      next.delete(folderKey);
    } else {
      next.add(folderKey);
    }
    setExpandedFolders(next);
  };

  const handleAddSkill = async () => {
    if (!skillNameInput) return;
    try {
      await createSkill(skillNameInput);
      toast.success("Skill created");
      setIsSkillModalOpen(false);
      setSkillNameInput("");
      queryClient.invalidateQueries({ queryKey: ["last-update"] });
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to create skill"));
    }
  };

  const handleAddFile = async () => {
    if (!fileNameInput || !fileModalData) return;
    try {
      await createSkillFile(
        fileModalData.skillName,
        fileModalData.folder,
        fileNameInput,
      );
      toast.success("File created");
      setIsFileModalOpen(false);
      setFileNameInput("");
      queryClient.invalidateQueries({ queryKey: ["last-update"] });
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to create file"));
    }
  };

  const handleAddProduct = async () => {
    if (!productNameInput) return;
    try {
      const result = await createAgentProduct(productNameInput);
      toast.success("Product created");
      setIsProductModalOpen(false);
      setProductNameInput("");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["agentFiles"] }); // Invalidate chat sidebar too
      router.push(`/admin/editor/${result.filename}`);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to create product"));
    }
  };

  const isSelected = (sel: FileSelection) => {
    if (selectedFile.type === "product" && sel.type === "product") {
      return selectedFile.filename === sel.filename;
    }
    if (selectedFile.type === "skill" && sel.type === "skill") {
      return (
        selectedFile.skillName === sel.skillName &&
        selectedFile.folder === sel.folder &&
        selectedFile.filename === sel.filename
      );
    }
    return false;
  };

  return (
    <>
      <aside className="w-[280px] flex h-full flex-col border-r border-border bg-sidebar overflow-hidden shrink-0">
        <div className="flex h-14 items-center px-4 border-b border-border font-semibold tracking-tight">
          <Package className="size-5 mr-2 text-[#6FB941]" />
          Product Viewer
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
          <div className="mb-6">
            <div className="flex items-center justify-between px-2 pb-1.5">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
                Active Product
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setIsProductModalOpen(true)}
                className="h-5 w-5 text-muted-foreground hover:text-foreground"
              >
                <Plus className="size-3.5" />
              </Button>
            </div>

            <div className="px-2 mb-2">
              <Select
                value={productFilename}
                onValueChange={(val) => {
                  router.push(`/admin/editor/${val}`);
                }}
              >
                <SelectTrigger className="w-full h-8 text-sm bg-background">
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p.replace(/[-_]/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-0.5 mt-2">
              <button
                onClick={() => toggleFolder("active-product")}
                className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm transition-colors text-muted-foreground hover:bg-accent hover:text-foreground text-left"
              >
                {expandedFolders.has("active-product") ? (
                  <ChevronDown className="size-3.5 shrink-0" />
                ) : (
                  <ChevronRight className="size-3.5 shrink-0" />
                )}
                <Cpu className="size-4 shrink-0" />
                <span className="truncate flex-1 font-medium capitalize">
                  {productFilename.replace(/[-_]/g, " ")}
                </span>
              </button>

              {expandedFolders.has("active-product") && (
                <div className="flex flex-col pl-6 pr-2 gap-0.5 mt-0.5 pb-2">
                  <button
                    onClick={() =>
                      onSelectFile({
                        type: "product",
                        filename: `${productFilename}/product.md`,
                      })
                    }
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1 text-xs transition-colors text-left",
                      isSelected({
                        type: "product",
                        filename: `${productFilename}/product.md`,
                      })
                        ? "bg-accent text-foreground font-medium"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                  >
                    <FileText className="size-3 shrink-0" />
                    <span className="truncate">product.md</span>
                  </button>
                  <button
                    onClick={() =>
                      onSelectFile({
                        type: "product",
                        filename: `${productFilename}/${productFilename}-brand-guidelines.md`,
                      })
                    }
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1 text-xs transition-colors text-left",
                      isSelected({
                        type: "product",
                        filename: `${productFilename}/${productFilename}-brand-guidelines.md`,
                      })
                        ? "bg-accent text-foreground font-medium"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                  >
                    <FileText className="size-3 shrink-0" />
                    <span className="truncate">
                      {productFilename}-brand-guidelines.md
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between px-2 pb-1.5">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
                Agent Skills
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setIsSkillModalOpen(true)}
                className="h-5 w-5 text-muted-foreground hover:text-foreground"
              >
                <Plus className="size-3.5" />
              </Button>
            </div>

            <div className="flex flex-col gap-1">
              {skills.map((skill) => (
                <div key={skill.name} className="flex flex-col">
                  <button
                    onClick={() => toggleSkill(skill.name)}
                    className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm transition-colors text-muted-foreground hover:bg-accent hover:text-foreground text-left"
                  >
                    {expandedSkills.has(skill.name) ? (
                      <ChevronDown className="size-3.5 shrink-0" />
                    ) : (
                      <ChevronRight className="size-3.5 shrink-0" />
                    )}
                    <span className="truncate flex-1 font-medium">
                      {skill.name}
                    </span>
                  </button>

                  {expandedSkills.has(skill.name) && (
                    <div className="flex flex-col pl-6 pr-2 gap-0.5 mt-0.5 pb-2">
                      {/* SKILL.md */}
                      {skill.files
                        .filter((f) => f.name === "SKILL.md")
                        .map((file) => {
                          const sel: FileSelection = {
                            type: "skill",
                            skillName: skill.name,
                            folder: null,
                            filename: file.name,
                          };
                          return (
                            <button
                              key={file.name}
                              onClick={() => onSelectFile(sel)}
                              className={cn(
                                "flex w-full items-center gap-2 rounded-md px-2 py-1 text-xs transition-colors text-left",
                                isSelected(sel)
                                  ? "bg-accent text-foreground font-medium"
                                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
                              )}
                            >
                              <FileText className="size-3 shrink-0" />
                              <span className="truncate">{file.name}</span>
                            </button>
                          );
                        })}

                      {/* References */}
                      <div className="mt-1">
                        <div className="group flex items-center justify-between">
                          <button
                            onClick={() =>
                              toggleFolder(`${skill.name}-references`)
                            }
                            className="flex items-center gap-1.5 rounded-md px-1 py-1 text-xs transition-colors text-muted-foreground hover:text-foreground text-left flex-1"
                          >
                            {expandedFolders.has(`${skill.name}-references`) ? (
                              <ChevronDown className="size-3 shrink-0" />
                            ) : (
                              <ChevronRight className="size-3 shrink-0" />
                            )}
                            <Folder className="size-3 shrink-0" />
                            <span className="truncate">references</span>
                          </button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => {
                              setFileModalData({
                                skillName: skill.name,
                                folder: "references",
                              });
                              setIsFileModalOpen(true);
                            }}
                            className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Plus className="size-3" />
                          </Button>
                        </div>

                        {expandedFolders.has(`${skill.name}-references`) && (
                          <div className="flex flex-col pl-4 mt-0.5 gap-0.5">
                            {skill.references.map((file) => {
                              const sel: FileSelection = {
                                type: "skill",
                                skillName: skill.name,
                                folder: "references",
                                filename: file.name,
                              };
                              return (
                                <button
                                  key={file.name}
                                  onClick={() => onSelectFile(sel)}
                                  className={cn(
                                    "flex w-full items-center gap-2 rounded-md px-2 py-1 text-[11px] transition-colors text-left",
                                    isSelected(sel)
                                      ? "bg-accent text-foreground font-medium"
                                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                                  )}
                                >
                                  <FileText className="size-3 shrink-0" />
                                  <span className="truncate">{file.name}</span>
                                </button>
                              );
                            })}
                            {skill.references.length === 0 && (
                              <span className="text-[10px] text-muted-foreground/50 px-2 italic">
                                Empty
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Evals */}
                      <div className="mt-1">
                        <div className="group flex items-center justify-between">
                          <button
                            onClick={() => toggleFolder(`${skill.name}-evals`)}
                            className="flex items-center gap-1.5 rounded-md px-1 py-1 text-xs transition-colors text-muted-foreground hover:text-foreground text-left flex-1"
                          >
                            {expandedFolders.has(`${skill.name}-evals`) ? (
                              <ChevronDown className="size-3 shrink-0" />
                            ) : (
                              <ChevronRight className="size-3 shrink-0" />
                            )}
                            <Folder className="size-3 shrink-0" />
                            <span className="truncate">evals</span>
                          </button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => {
                              setFileModalData({
                                skillName: skill.name,
                                folder: "evals",
                              });
                              setIsFileModalOpen(true);
                            }}
                            className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Plus className="size-3" />
                          </Button>
                        </div>

                        {expandedFolders.has(`${skill.name}-evals`) && (
                          <div className="flex flex-col pl-4 mt-0.5 gap-0.5">
                            {skill.evals.map((file) => {
                              const sel: FileSelection = {
                                type: "skill",
                                skillName: skill.name,
                                folder: "evals",
                                filename: file.name,
                              };
                              return (
                                <button
                                  key={file.name}
                                  onClick={() => onSelectFile(sel)}
                                  className={cn(
                                    "flex w-full items-center gap-2 rounded-md px-2 py-1 text-[11px] transition-colors text-left",
                                    isSelected(sel)
                                      ? "bg-accent text-foreground font-medium"
                                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                                  )}
                                >
                                  <FileText className="size-3 shrink-0" />
                                  <span className="truncate">{file.name}</span>
                                </button>
                              );
                            })}
                            {skill.evals.length === 0 && (
                              <span className="text-[10px] text-muted-foreground/50 px-2 italic">
                                Empty
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* Add Skill Modal */}
      <Dialog open={isSkillModalOpen} onOpenChange={setIsSkillModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Skill</DialogTitle>
          </DialogHeader>
          <div className="flex items-center space-x-2 py-4">
            <Input
              placeholder="Skill name (e.g., ai-seo)"
              value={skillNameInput}
              onChange={(e) => setSkillNameInput(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsSkillModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddSkill}
              disabled={!skillNameInput}
              className="bg-[#6FB941] hover:bg-[#6FB941]/90 text-white"
            >
              Add Skill
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add File Modal */}
      <Dialog open={isFileModalOpen} onOpenChange={setIsFileModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New File</DialogTitle>
          </DialogHeader>
          <div className="flex items-center space-x-2 py-4">
            <Input
              placeholder={`Filename (without .md)`}
              value={fileNameInput}
              onChange={(e) => setFileNameInput(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFileModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddFile}
              disabled={!fileNameInput}
              className="bg-[#6FB941] hover:bg-[#6FB941]/90 text-white"
            >
              Add File
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Product Modal */}
      <Dialog open={isProductModalOpen} onOpenChange={setIsProductModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Product</DialogTitle>
          </DialogHeader>
          <div className="flex items-center space-x-2 py-4">
            <Input
              placeholder={`Product name (e.g., my-new-product)`}
              value={productNameInput}
              onChange={(e) => setProductNameInput(e.target.value)}
            />
          </div>
          <p className="text-xs text-muted-foreground -mt-2 mb-2">
            Will be saved as:{" "}
            <strong>
              {productNameInput
                ? `.agents/${productNameInput}/product.md`
                : "..."}
            </strong>
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsProductModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddProduct}
              disabled={!productNameInput}
              className="bg-[#6FB941] hover:bg-[#6FB941]/90 text-white"
            >
              Add Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
