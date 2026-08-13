import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="grid min-h-svh place-items-center bg-muted/40 px-4">
      <div className="text-center">
        <div className="mb-6 flex justify-center">
          <BrandMark className="size-10" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">404</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          This page doesn&apos;t exist
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          It may have been unpublished, moved, or the link is wrong.
        </p>
        <Button asChild className="mt-6">
          <Link href="/">Back to Marketing OS</Link>
        </Button>
      </div>
    </div>
  );
}
