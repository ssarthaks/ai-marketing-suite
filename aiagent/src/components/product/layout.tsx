"use client";

import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { PanelLeftOpen } from "lucide-react";
import { ProductSidebar } from "./sidebar";
import { FileSelection } from "./product-editor";

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
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSelectFile = (file: FileSelection) => {
    onSelectFile(file);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      {!isMobile && (
        <ProductSidebar
          productFilename={productFilename}
          selectedFile={selectedFile}
          onSelectFile={handleSelectFile}
        />
      )}

      {isMobile && (
        <>
          <div className="absolute left-3 top-3 z-10">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              className="rounded-lg border border-border bg-background/80 backdrop-blur"
            >
              <PanelLeftOpen className="size-4" />
            </Button>
          </div>
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetContent side="left" className="w-[280px] p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <ProductSidebar
                productFilename={productFilename}
                selectedFile={selectedFile}
                onSelectFile={handleSelectFile}
              />
            </SheetContent>
          </Sheet>
        </>
      )}

      <main className="flex min-w-0 flex-1 flex-col p-4 md:p-6 bg-muted/20">
        {children}
      </main>
    </div>
  );
}
