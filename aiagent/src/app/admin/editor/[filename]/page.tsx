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
  // Await the params Promise in Next.js 15
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
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isAuthorized =
    session?.user?.role === "admin" || session?.user?.role === "team_lead";

  if (!isAuthorized) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-background text-foreground">
        <h1 className="text-2xl font-bold tracking-tight">
          Unauthorized Access
        </h1>
        <p className="text-sm text-muted-foreground">
          You do not have permission to view or edit product files.
        </p>
        <Button variant="outline" onClick={() => router.push("/")}>
          <ArrowLeft className="mr-2 size-4" />
          Return to Chat
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
