import type { VisibilityStatus, WorkspaceRole } from "@prisma/client";

/**
 * Builds Prisma OR query condition for checking if a resource is visible to currentUserId.
 * An item is visible if it is PUBLIC, or owned by currentUserId, or sharedWithUserIds contains currentUserId.
 */
export function visibilityWhereClause(currentUserId: string, ownerField: "createdById" | "uploadedById" = "createdById") {
  return {
    OR: [
      { visibility: "PUBLIC" as VisibilityStatus },
      { [ownerField]: currentUserId },
      { sharedWithUserIds: { has: currentUserId } },
    ],
  };
}

/**
 * Mutations are stricter than reads: workspace managers can govern shared
 * resources, while ordinary members may only change resources they created.
 */
export function managementWhereClause(
  currentUserId: string,
  role: WorkspaceRole,
  ownerField: "createdById" | "uploadedById" = "createdById",
) {
  if (role === "OWNER" || role === "ADMIN") return {};
  return { [ownerField]: currentUserId };
}

export function isWorkspaceManager(role: WorkspaceRole): boolean {
  return role === "OWNER" || role === "ADMIN";
}
