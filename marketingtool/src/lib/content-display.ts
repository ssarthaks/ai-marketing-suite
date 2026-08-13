import { CONTENT_TYPE_LABELS } from "@/lib/constants";

/**
 * Specialist generators share ContentGeneration with ordinary copy assets.
 * Their persisted ContentType is an implementation detail, so use collection
 * as the primary display category whenever it identifies a specialist tool.
 */
export const AI_COLLECTION_LABELS: Readonly<Record<string, string>> = {
  AI_STUDIO: "Standalone AI Studio Asset",
  AI_RESEARCH: "EdTech Market Intelligence",
  AI_OPTIMIZER: "Copy Strategy Audit",
  AI_REPURPOSER: "Repurposing Blueprint",
  AI_BATTLECARDS: "Competitor Battlecard",
  AI_EMAIL_CAMPAIGNS: "Email Drip Sequence",
  AI_SOCIAL_ARCHITECT: "Organic Social Campaign",
};

interface GenerationDisplayInput {
  type: string;
  collection?: string | null;
}

export function getGenerationDisplayLabel({
  type,
  collection,
}: GenerationDisplayInput): string {
  if (collection) {
    const collectionLabel = AI_COLLECTION_LABELS[collection];
    if (collectionLabel) return collectionLabel;
  }

  return CONTENT_TYPE_LABELS[type] ?? type;
}

export function getCollectionDisplayLabel(collection: string): string {
  return AI_COLLECTION_LABELS[collection] ?? collection;
}

export function getGenerationDisplayKey({
  type,
  collection,
}: GenerationDisplayInput): string {
  return collection && AI_COLLECTION_LABELS[collection]
    ? `collection:${collection}`
    : `type:${type}`;
}
