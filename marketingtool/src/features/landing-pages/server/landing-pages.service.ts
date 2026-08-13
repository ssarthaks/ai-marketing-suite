import "server-only";

import { db } from "@/server/db";
import { parseSectionContent } from "@/features/landing-pages/schemas/section.schema";
import { visibilityWhereClause } from "@/lib/visibility";

export async function listLandingPages(workspaceId: string, userId?: string) {
  return db.landingPage.findMany({
    where: {
      workspaceId,
      ...(userId
        ? {
            OR: [
              { visibility: "PUBLIC" },
              { createdById: userId },
              { sharedWithUserIds: { has: userId } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      campaign: { select: { id: true, title: true } },
      _count: { select: { sections: true, leads: true } },
    },
  });
}

export type LandingPageEditorData = NonNullable<
  Awaited<ReturnType<typeof getLandingPageForEditor>>
>;

export async function getLandingPageForEditor(
  workspaceId: string,
  id: string,
  userId: string,
) {
  const page = await db.landingPage.findFirst({
    where: { id, workspaceId, ...visibilityWhereClause(userId) },
    include: {
      sections: { orderBy: { order: "asc" } },
      campaign: {
        where: visibilityWhereClause(userId),
        select: { id: true, title: true },
      },
    },
  });
  if (!page) return null;

  return {
    id: page.id,
    title: page.title,
    slug: page.slug,
    description: page.description,
    status: page.status,
    publishedAt: page.publishedAt?.toISOString() ?? null,
    seoTitle: page.seoTitle,
    seoDescription: page.seoDescription,
    views: page.views,
    campaign: page.campaign,
    sections: page.sections.map((section) => ({
      id: section.id,
      order: section.order,
      ...parseSectionContent(section.type, section.content),
    })),
  };
}

export type PublicLandingPage = NonNullable<
  Awaited<ReturnType<typeof getPublishedLandingPage>>
>;

export async function getPublishedLandingPage(slug: string) {
  const page = await db.landingPage.findFirst({
    where: { slug, status: "PUBLISHED" },
    include: { sections: { orderBy: { order: "asc" } } },
  });
  if (!page) return null;

  return {
    id: page.id,
    title: page.title,
    seoTitle: page.seoTitle,
    seoDescription: page.seoDescription,
    description: page.description,
    sections: page.sections.map((section) => ({
      id: section.id,
      ...parseSectionContent(section.type, section.content),
    })),
  };
}
