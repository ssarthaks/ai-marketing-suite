"use client";

import { useState } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { PanelLeftOpen } from "lucide-react";
import { FileSelection } from "./product-editor";
import { ProductSidebar } from "./sidebar";

interface ProductLayoutProps {
  children: React.ReactNode;
  productFilename: string;
  selectedFile: FileSelection;
  onSelectFile: (file: FileSelection) => void;
}

export function ProductLayout({
  children,
  productFilename,
  selectedFile,
  onSelectFile,
}: ProductLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSelectFile = (file: FileSelection) => {
    onSelectFile(file);
    setMobileOpen(false);
  };

  return (
    <div className="flex h-svh w-full overflow-hidden bg-background text-foreground">
      <div className="hidden md:block">
        <ProductSidebar
          productFilename={productFilename}
          selectedFile={selectedFile}
          onSelectFile={handleSelectFile}
        />
      </div>

      <div className="block md:hidden">
        <div className="absolute left-3 top-3 z-10">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            className="rounded-lg border border-border bg-background/80 backdrop-blur"
          >
            <PanelLeftOpen className="size-4" />
          </Button>
        </div>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-[280px] max-w-[calc(100vw-0.75rem)] p-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <ProductSidebar
              productFilename={productFilename}
              selectedFile={selectedFile}
              onSelectFile={handleSelectFile}
            />
          </SheetContent>
        </Sheet>
      </div>

      <main className="min-w-0 flex-1 overflow-hidden p-2 pt-14 sm:p-3 sm:pt-14 md:p-6">{children}</main>
    </div>
  );
}
