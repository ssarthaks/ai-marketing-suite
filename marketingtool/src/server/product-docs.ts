import "server-only";

import { z } from "zod";

import { query } from "@/lib/db";
import { db } from "@/server/db";

/**
 * Keep the knowledge base well within model context limits; the product
 * research docs run 20–30k characters and the useful overview lives up front.
 */
const MAX_DOC_CHARS = 14000;
const productKeySchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/);

/**
 * Resolve a requested product only when the local authenticated user belongs
 * to the workspace that owns it. Client-supplied project keys are never
 * authorization evidence.
 */
export async function resolveAccessibleProductKey(
  userId: string,
  requestedProductKey: string | null | undefined,
  activeProductKey: string | null | undefined,
): Promise<string | null> {
  const requested = requestedProductKey?.trim() || activeProductKey?.trim();
  if (!requested) return null;
  const key = productKeySchema.parse(requested);
  const workspace = await db.workspace.findFirst({
    where: {
      productKey: key,
      members: { some: { userId } },
    },
    select: { productKey: true },
  });
  if (!workspace?.productKey) {
    throw new Error("Product project is not available in this workspace");
  }
  return workspace.productKey;
}

/**
 * Load the shared product research doc (.agents/<key>/product.md) from the
 * AiAgent markdown_files table for grounding AI generations. Returns null when
 * the doc is missing or unreadable — generation proceeds without it.
 */
export async function getProductDoc(
  productKey: string | null | undefined,
): Promise<string | null> {
  if (!productKey) return null;
  const safeProductKey = productKeySchema.parse(productKey);
  try {
    const res = await query(
      "SELECT LEFT(content, $2) AS content FROM markdown_files WHERE file_path = $1",
      [`.agents/${safeProductKey}/product.md`, MAX_DOC_CHARS],
    );
    const content: string | undefined = res.rows[0]?.content;
    if (!content?.trim()) return null;
    if (content.length <= MAX_DOC_CHARS) return content;
    return `${content.slice(0, MAX_DOC_CHARS)}\n\n[Document truncated]`;
  } catch (error) {
    console.error(
      `[product-docs] Failed to load doc for ${productKey}:`,
      error,
    );
    return null;
  }
}
