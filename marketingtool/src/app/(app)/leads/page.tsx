import type { Metadata } from "next";
import Link from "next/link";
import { Users } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireWorkspace } from "@/server/auth/session";
import { LeadsToolbar } from "@/features/leads/components/leads-toolbar";
import { countLeads, listLeads } from "@/features/leads/server/leads.service";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = {
  title: "Leads Database | Marketing OS - Subscriber Contacts & Attribution",
  description:
    "Manage subscriber contacts captured across landing pages and lead magnets with acquisition attribution and list export tools.",
};

const SOURCE_LABELS: Record<string, string> = {
  "lead-magnet": "Lead magnet",
  "landing-page": "Landing page",
  direct: "Direct",
};

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; source?: string; segment?: string }>;
}) {
  const { workspaceId } = await requireWorkspace();
  const params = await searchParams;

  const [leads, total] = await Promise.all([
    listLeads(workspaceId, {
      query: params.q,
      source: params.source,
      segment: params.segment,
    }),
    countLeads(workspaceId),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leads"
        description={`${total} lead${total === 1 ? "" : "s"} captured across landing pages and lead magnets.`}
      />
      {total === 0 ? (
        <EmptyState
          icon={Users}
          title="No leads yet"
          description="Publish a landing page with a contact section or a lead magnet — every email captured shows up here."
        />
      ) : (
        <div className="space-y-4">
          <LeadsToolbar />
          {leads.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Nothing matches"
              description="Try a different search or source filter."
              className="min-h-[220px]"
            />
          ) : (
            <div className="overflow-hidden rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Email</TableHead>
                    <TableHead className="hidden sm:table-cell">Name</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="hidden md:table-cell">From</TableHead>
                    <TableHead className="hidden lg:table-cell">
                      Captured
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => {
                    const origin = lead.leadMagnet
                      ? {
                          title: lead.leadMagnet.title,
                          href: `/lead-magnets/${lead.leadMagnet.id}`,
                        }
                      : lead.landingPage
                        ? {
                            title: lead.landingPage.title,
                            href: `/landing-pages/${lead.landingPage.id}`,
                          }
                        : null;
                    return (
                      <TableRow key={lead.id}>
                        <TableCell className="font-medium">
                          {lead.email}
                        </TableCell>
                        <TableCell className="hidden text-muted-foreground sm:table-cell">
                          {lead.name ?? "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {SOURCE_LABELS[lead.source] ?? lead.source}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {origin ? (
                            <Link
                              href={origin.href}
                              className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                            >
                              {origin.title}
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden text-muted-foreground lg:table-cell">
                          {formatDate(lead.createdAt)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
