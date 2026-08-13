import Image from "next/image";

import { cn } from "@/lib/utils";
import logo from "@/assets/logo-v2.png";

export function BrandMark({ className }: { className?: string }) {
  return (
    <Image
      src={logo}
      alt="Marketing OS"
      className={cn("size-8 rounded-lg object-contain dark:invert", className)}
      priority
    />
  );
}
