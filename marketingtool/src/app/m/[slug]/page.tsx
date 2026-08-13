import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Gift } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { getPublishedLeadMagnet } from "@/features/lead-magnets/server/lead-magnets.service";
import { MagnetGate } from "@/features/lead-magnets/components/magnet-gate";
import { LEAD_MAGNET_TYPE_LABELS } from "@/lib/constants";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const magnet = await getPublishedLeadMagnet(slug);
  if (!magnet) return { title: "Not found" };
  return {
    title: magnet.title,
    description: magnet.description ?? undefined,
  };
}

export default async function PublicLeadMagnetPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const magnet = await getPublishedLeadMagnet(slug);
  if (!magnet) notFound();

  return (
    <main className="grid min-h-svh place-items-center bg-muted/40 px-4 py-16">
      <div className="w-full max-w-xl space-y-8 text-center">
        <div className="space-y-4">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Gift className="size-7" />
          </div>
          <Badge variant="secondary">
            Free {LEAD_MAGNET_TYPE_LABELS[magnet.type]}
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            {magnet.title}
          </h1>
          {magnet.description && (
            <p className="mx-auto max-w-lg text-muted-foreground">
              {magnet.description}
            </p>
          )}
        </div>
        <div className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
          <MagnetGate leadMagnetId={magnet.id} />
        </div>
        <p className="text-xs text-muted-foreground">
          Powered by Marketing OS
        </p>
      </div>
    </main>
  );
}
