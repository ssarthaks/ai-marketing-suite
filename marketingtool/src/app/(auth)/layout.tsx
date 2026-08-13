import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="grid min-h-svh place-items-center bg-muted/40 px-3 py-6 sm:px-4 sm:py-12">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="mb-8 flex items-center justify-center gap-2.5"
        >
          <BrandMark />
          <span className="text-lg font-semibold tracking-tight">
            Marketing OS
          </span>
        </Link>
        {children}
      </div>
    </div>
  );
}
