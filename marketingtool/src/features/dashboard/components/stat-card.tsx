import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { formatNumber } from "@/lib/format";

interface StatCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  href: string;
}

export function StatCard({ label, value, icon: Icon, href }: StatCardProps) {
  return (
    <Card className="relative gap-1 p-5 transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          <Link href={href}>
            <span className="absolute inset-0" aria-hidden />
            {label}
          </Link>
        </p>
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <p className="text-2xl font-semibold tracking-tight tabular-nums">
        {formatNumber(value)}
      </p>
    </Card>
  );
}
