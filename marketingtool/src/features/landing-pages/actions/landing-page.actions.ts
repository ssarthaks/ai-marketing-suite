"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { SectionType } from "@prisma/client";
import { z } from "zod";

import { db } from "@/server/db";
import { requireWorkspace } from "@/server/auth/session";
import { logActivity } from "@/server/activity";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { uniqueSlug } from "@/lib/slugify";
import {
  createLandingPageSchema,
  landingPageSettingsSchema,
  type CreateLandingPageInput,
  type LandingPageSettingsInput,
} from "@/features/landing-pages/schemas/landing-page.schema";
import {
  DEFAULT_SECTION_CONTENT,
  SECTION_SCHEMAS,
} from "@/features/landing-pages/schemas/section.schema";
import {
  managementWhereClause,
  visibilityWhereClause,
} from "@/lib/visibility";
import type { WorkspaceRole } from "@prisma/client";

function revalidateEditor(pageId: string, slug?: string) {
  revalidatePath("/landing-pages");
  revalidatePath(`/landing-pages/${pageId}`);
  if (slug) revalidatePath(`/p/${slug}`);
}

async function findManagedPage(
  id: string,
  workspaceId: string,
  userId: string,
  role: WorkspaceRole,
) {
  return db.landingPage.findFirst({
    where: {
      id,
      workspaceId,
      ...managementWhereClause(userId, role),
    },
    select: { id: true, title: true, slug: true, status: true },
  });
}

async function validShareRecipients(workspaceId: string, userIds: string[]) {
  const unique = [...new Set(userIds)];
  if (unique.length !== userIds.length) return false;
  if (unique.length === 0) return true;
  const count = await db.workspaceMember.count({
    where: { workspaceId, userId: { in: unique } },
  });
  return count === unique.length;
}

export async function createLandingPageAction(
  input: CreateLandingPageInput
): Promise<ActionResult<void>> {
  const { userId, workspaceId } = await requireWorkspace();

  const parsed = createLandingPageSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Invalid input", parsed.error.flatten().fieldErrors);
  }

  if (parsed.data.campaignId) {
    const campaign = await db.campaign.findFirst({
      where: {
        id: parsed.data.campaignId,
        workspaceId,
        ...visibilityWhereClause(userId),
      },
      select: { id: true },
    });
    if (!campaign) return fail("Campaign not found");
  }
  const sharedWithUserIds = parsed.data.sharedWithUserIds || [];
  if (!(await validShareRecipients(workspaceId, sharedWithUserIds))) {
    return fail("One or more sharing recipients are not workspace members.");
  }

  const page = await db.landingPage.create({
    data: {
      title: parsed.data.title,
      slug: uniqueSlug(parsed.data.title),
      workspaceId,
      campaignId: parsed.data.campaignId ?? null,
      createdById: userId,
      visibility: parsed.data.visibility || "PUBLIC",
      sharedWithUserIds,
      sections: {
        create: [
          {
            type: "HERO",
            order: 0,
            content: DEFAULT_SECTION_CONTENT.HERO as object,
          },
          {
            type: "FEATURES",
            order: 1,
            content: DEFAULT_SECTION_CONTENT.FEATURES as object,
          },
          {
            type: "CTA",
            order: 2,
            content: DEFAULT_SECTION_CONTENT.CTA as object,
          },
        ],
      },
    },
  });

  await logActivity({
    workspaceId,
    userId,
    action: "CREATED",
    entityType: "LANDING_PAGE",
    entityId: page.id,
    title: `Created landing page “${page.title}”`,
    metadata: page.campaignId ? { campaignId: page.campaignId } : undefined,
  });

  revalidatePath("/landing-pages");
  redirect(`/landing-pages/${page.id}`);
}

export async function updateLandingPageSettingsAction(
  id: string,
  input: LandingPageSettingsInput
): Promise<ActionResult<void>> {
  const { userId, workspaceId, role } = await requireWorkspace();

  const parsed = landingPageSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Invalid input", parsed.error.flatten().fieldErrors);
  }

  const existing = await findManagedPage(id, workspaceId, userId, role);
  if (!existing) return fail("Page not found");

  if (parsed.data.slug !== existing.slug) {
    const slugTaken = await db.landingPage.findUnique({
      where: { slug: parsed.data.slug },
      select: { id: true },
    });
    if (slugTaken) {
      return fail("That slug is already in use", {
        slug: ["That slug is already in use"],
      });
    }
  }

  await db.landingPage.update({
    where: { id },
    data: {
      title: parsed.data.title,
      slug: parsed.data.slug,
      description: parsed.data.description || null,
      seoTitle: parsed.data.seoTitle || null,
      seoDescription: parsed.data.seoDescription || null,
    },
  });

  revalidateEditor(id, existing.slug);
  revalidatePath(`/p/${parsed.data.slug}`);
  return ok(undefined);
}

export async function updateLandingPageStatusAction(
  id: string,
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED"
): Promise<ActionResult<void>> {
  const { userId, workspaceId, role } = await requireWorkspace();

  const parsedStatus = z
    .enum(["DRAFT", "PUBLISHED", "ARCHIVED"])
    .safeParse(status);
  if (!parsedStatus.success) return fail("Invalid status");

  const existing = await findManagedPage(id, workspaceId, userId, role);
  if (!existing) return fail("Page not found");

  await db.landingPage.update({
    where: { id },
    data: {
      status: parsedStatus.data,
      publishedAt:
        parsedStatus.data === "PUBLISHED"
          ? new Date()
          : existing.status === "PUBLISHED"
            ? undefined
            : null,
    },
  });

  await logActivity({
    workspaceId,
    userId,
    action: parsedStatus.data === "PUBLISHED" ? "PUBLISHED" : "UPDATED",
    entityType: "LANDING_PAGE",
    entityId: id,
    title: `Moved landing page “${existing.title}” to ${parsedStatus.data.toLowerCase()}`,
  });

  revalidateEditor(id, existing.slug);
  return ok(undefined);
}

export async function setLandingPagePublishedAction(
  id: string,
  publish: boolean
): Promise<ActionResult<{ status: "PUBLISHED" | "DRAFT" }>> {
  const { userId, workspaceId, role } = await requireWorkspace();

  const existing = await findManagedPage(id, workspaceId, userId, role);
  if (!existing) return fail("Page not found");

  const status = publish ? "PUBLISHED" : "DRAFT";
  await db.landingPage.update({
    where: { id },
    data: {
      status,
      publishedAt: publish ? new Date() : null,
    },
  });

  await logActivity({
    workspaceId,
    userId,
    action: publish ? "PUBLISHED" : "UNPUBLISHED",
    entityType: "LANDING_PAGE",
    entityId: id,
    title: `${publish ? "Published" : "Unpublished"} “${existing.title}”`,
  });

  revalidateEditor(id, existing.slug);
  return ok({ status });
}

export async function deleteLandingPageAction(
  id: string
): Promise<ActionResult<void>> {
  const { userId, workspaceId, role } = await requireWorkspace();

  const existing = await findManagedPage(id, workspaceId, userId, role);
  if (!existing) return fail("Page not found");

  await db.landingPage.delete({ where: { id } });

  await logActivity({
    workspaceId,
    userId,
    action: "DELETED",
    entityType: "LANDING_PAGE",
    entityId: id,
    title: `Deleted landing page “${existing.title}”`,
  });

  revalidatePath("/landing-pages");
  revalidatePath(`/p/${existing.slug}`);
  redirect("/landing-pages");
}

async function findManagedSection(
  sectionId: string,
  workspaceId: string,
  userId: string,
  role: WorkspaceRole,
) {
  return db.landingPageSection.findFirst({
    where: {
      id: sectionId,
      landingPage: {
        workspaceId,
        ...managementWhereClause(userId, role),
      },
    },
    include: {
      landingPage: { select: { id: true, slug: true } },
    },
  });
}

export async function addSectionAction(
  pageId: string,
  type: SectionType
): Promise<ActionResult<void>> {
  const { userId, workspaceId, role } = await requireWorkspace();

  const parsedType = z.enum(SectionType).safeParse(type);
  if (!parsedType.success) return fail("Invalid section type");

  const page = await findManagedPage(pageId, workspaceId, userId, role);
  if (!page) return fail("Page not found");

  const last = await db.landingPageSection.findFirst({
    where: { landingPageId: pageId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  await db.landingPageSection.create({
    data: {
      landingPageId: pageId,
      type: parsedType.data,
      order: (last?.order ?? -1) + 1,
      content: DEFAULT_SECTION_CONTENT[parsedType.data] as object,
    },
  });

  revalidateEditor(pageId, page.slug);
  return ok(undefined);
}

export async function updateSectionAction(
  sectionId: string,
  content: unknown
): Promise<ActionResult<void>> {
  const { userId, workspaceId, role } = await requireWorkspace();

  const section = await findManagedSection(
    sectionId,
    workspaceId,
    userId,
    role,
  );
  if (!section) return fail("Section not found");

  const parsed = SECTION_SCHEMAS[section.type].safeParse(content);
  if (!parsed.success) {
    return fail("Invalid section content", parsed.error.flatten().fieldErrors);
  }

  await db.landingPageSection.update({
    where: { id: sectionId },
    data: { content: parsed.data as object },
  });

  revalidateEditor(section.landingPage.id, section.landingPage.slug);
  return ok(undefined);
}

export async function moveSectionAction(
  sectionId: string,
  direction: "up" | "down"
): Promise<ActionResult<void>> {
  const { userId, workspaceId, role } = await requireWorkspace();

  if (direction !== "up" && direction !== "down") {
    return fail("Invalid direction");
  }
  const section = await findManagedSection(
    sectionId,
    workspaceId,
    userId,
    role,
  );
  if (!section) return fail("Section not found");

  const neighbor = await db.landingPageSection.findFirst({
    where: {
      landingPageId: section.landingPageId,
      order:
        direction === "up" ? { lt: section.order } : { gt: section.order },
    },
    orderBy: { order: direction === "up" ? "desc" : "asc" },
  });
  if (!neighbor) return ok(undefined);

  await db.$transaction([
    db.landingPageSection.update({
      where: { id: section.id },
      data: { order: neighbor.order },
    }),
    db.landingPageSection.update({
      where: { id: neighbor.id },
      data: { order: section.order },
    }),
  ]);

  revalidateEditor(section.landingPage.id, section.landingPage.slug);
  return ok(undefined);
}

export async function deleteSectionAction(
  sectionId: string
): Promise<ActionResult<void>> {
  const { userId, workspaceId, role } = await requireWorkspace();

  const section = await findManagedSection(
    sectionId,
    workspaceId,
    userId,
    role,
  );
  if (!section) return fail("Section not found");

  await db.landingPageSection.delete({ where: { id: sectionId } });

  revalidateEditor(section.landingPage.id, section.landingPage.slug);
  return ok(undefined);
}
