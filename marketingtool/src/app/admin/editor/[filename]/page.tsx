"use client";

import { useState, use } from "react";
import { ProductLayout } from "@/components/product/layout";
import {
  ProductEditor,
  FileSelection,
} from "@/components/product/product-editor";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProductPageProps {
  params: Promise<{ filename: string }>;
}

export default function ProductPage({ params }: ProductPageProps) {
  const resolvedParams = use(params);
  const { filename } = resolvedParams;

  const { data: session, status } = useSession();
  const router = useRouter();

  const [selectedFile, setSelectedFile] = useState<FileSelection>({
    type: "product",
    filename: `${filename}/product.md`,
  });

  if (status === "loading") {
    return (
      <div className="flex h-svh w-full items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Allow any logged in workspace member / user
  if (!session) {
    return (
      <div className="flex h-svh w-full flex-col items-center justify-center gap-4 bg-background px-4 text-center text-foreground">
        <h1 className="text-2xl font-bold tracking-tight">
          Unauthorized Access
        </h1>
        <p className="text-sm text-muted-foreground">
          Please log in to view or edit product files.
        </p>
        <Button variant="outline" onClick={() => router.push("/")}>
          <ArrowLeft className="mr-2 size-4" />
          Return to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <ProductLayout
      productFilename={filename}
      selectedFile={selectedFile}
      onSelectFile={setSelectedFile}
    >
      <div className="flex flex-col h-full overflow-hidden">
        <ProductEditor selectedFile={selectedFile} />
      </div>
    </ProductLayout>
  );
}
