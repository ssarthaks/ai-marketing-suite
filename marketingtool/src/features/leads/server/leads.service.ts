import "server-only";

import type { Prisma } from "@prisma/client";

import { db } from "@/server/db";

export async function listLeads(
  workspaceId: string,
  filter?: { query?: string; source?: string; segment?: string }
) {
  const where: Prisma.LeadWhereInput = {
    workspaceId,
    ...(filter?.source ? { source: filter.source } : {}),
    ...(filter?.segment
      ? {
          OR: [
            { email: { contains: filter.segment, mode: "insensitive" as const } },
            { name: { contains: filter.segment, mode: "insensitive" as const } },
            { source: { contains: filter.segment, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(filter?.query
      ? {
          OR: [
            { email: { contains: filter.query, mode: "insensitive" as const } },
            { name: { contains: filter.query, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  return db.lead.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      leadMagnet: { select: { id: true, title: true } },
      landingPage: { select: { id: true, title: true } },
    },
  });
}

export async function countLeads(workspaceId: string) {
  return db.lead.count({ where: { workspaceId } });
}
