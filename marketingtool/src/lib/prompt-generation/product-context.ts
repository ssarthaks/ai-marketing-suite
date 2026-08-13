import { query } from "@/lib/db";

const MAX_PRODUCT_FILES = 16;
const MAX_PRODUCT_FILE_CHARS = 20_000;
const MAX_PRODUCT_CONTEXT_CHARS = 70_000;

// Built-in keyword alias map for demo products
const PRODUCT_KEYWORDS: Record<string, string[]> = {
  "demo-saas": [
    "demo-saas",
    "acme",
    "acme cloud suite",
    "saas",
    "workflow automation",
  ],
  "demo-edtech": [
    "demo-edtech",
    "eduspark",
    "edtech",
    "learning platform",
    "ai tutor",
  ],
  "demo-ecommerce": [
    "demo-ecommerce",
    "artisancraft",
    "ecommerce",
    "d2c",
    "sustainable home",
  ],
};

function normalizeString(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Fetch all markdown files for a given product folder from the database.
 */
async function getFilesForProduct(
  productKey: string,
): Promise<{ filePath: string; content: string }[]> {
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(productKey)) return [];
  try {
    const prefix = `.agents/${productKey}/`;
    const res = await query(
      `SELECT file_path, LEFT(content, $2) AS content
       FROM markdown_files
       WHERE LEFT(file_path, LENGTH($1)) = $1
       ORDER BY file_path ASC
       LIMIT $3`,
      [prefix, MAX_PRODUCT_FILE_CHARS, MAX_PRODUCT_FILES],
    );
    return res.rows.map((r) => ({
      filePath: r.file_path,
      content: r.content || "",
    }));
  } catch (e) {
    console.warn(`Could not fetch markdown files for product ${productKey}:`, e);
    return [];
  }
}

/**
 * Format a list of product files into a unified context payload.
 */
function formatProductFilesToContext(
  productKey: string,
  files: { filePath: string; content: string }[],
): string {
  if (!files || files.length === 0) return "";

  // Order files: product.md first, brand guidelines second, rest after
  const sortedFiles = [...files].sort((a, b) => {
    const aPath = a.filePath.toLowerCase();
    const bPath = b.filePath.toLowerCase();

    if (aPath.endsWith("/product.md")) return -1;
    if (bPath.endsWith("/product.md")) return 1;

    if (aPath.includes("brand-guidelines")) return -1;
    if (bPath.includes("brand-guidelines")) return 1;

    return aPath.localeCompare(bPath);
  });

  const sections: string[] = [];

  for (const f of sortedFiles) {
    const fileName = f.filePath.split("/").pop() || f.filePath;
    if (!f.content.trim()) continue;

    let sectionTitle = `DOCUMENT: ${fileName}`;
    if (fileName === "product.md") {
      sectionTitle = `CORE PRODUCT DETAILS & SPECIFICATION (${fileName})`;
    } else if (fileName.includes("brand-guidelines")) {
      sectionTitle = `BRAND GUIDELINES & VOICE (${fileName})`;
    }

    sections.push(`### ${sectionTitle}\n\n${f.content.trim()}`);
  }

  const context = sections.join("\n\n" + "=".repeat(40) + "\n\n");
  return context.length <= MAX_PRODUCT_CONTEXT_CHARS
    ? context
    : `${context.slice(0, MAX_PRODUCT_CONTEXT_CHARS)}\n\n[Product context truncated]`;
}

async function getProductContext(
  messages: any[] | undefined,
  allowedProducts: string[],
): Promise<{
  content: string;
  matchedProduct: string | null;
  availableFiles: string[];
}> {
  const result: {
    content: string;
    matchedProduct: string | null;
    availableFiles: string[];
  } = { content: "", matchedProduct: null, availableFiles: [] };

  try {
    const files = [
      ...new Set(
        allowedProducts.filter((product) =>
          /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(product),
        ),
      ),
    ];
    if (files.length === 0) return result;
    result.availableFiles = files;

    if (!messages || messages.length === 0) return result;

    // Filter to user messages and iterate backwards to find the most recently mentioned product
    const userMessages = messages.filter((m) => m.role === "user");

    for (let i = userMessages.length - 1; i >= 0; i--) {
      const rawText = userMessages[i].content.toLowerCase();
      const normalizedText = normalizeString(rawText);
      const matches = new Set<string>();

      for (const file of files) {
        const normalizedFile = normalizeString(file);

        // Exact or normalized match with product folder name
        if (
          rawText.includes(file.toLowerCase()) ||
          normalizedText.includes(normalizedFile)
        ) {
          matches.add(file);
          continue;
        }

        // Keyword list match
        const keywords = PRODUCT_KEYWORDS[file] || [];
        for (const keyword of keywords) {
          if (
            rawText.includes(keyword.toLowerCase()) ||
            normalizedText.includes(normalizeString(keyword))
          ) {
            matches.add(file);
            break;
          }
        }
      }

      // If we found exactly one match in this message, we have our active product!
      if (matches.size === 1) {
        const matchedFile = Array.from(matches)[0];
        result.matchedProduct = matchedFile;

        const productFiles = await getFilesForProduct(matchedFile);
        result.content = formatProductFilesToContext(matchedFile, productFiles);

        console.log(
          `[AI Agent] Successfully loaded product context for ${matchedFile} from turn ${i}`,
        );
        return result;
      }
      // If ambiguous in a single turn, we stop searching backward
      else if (matches.size > 1) {
        console.log(
          `[AI Agent] Product match count: ${matches.size} in turn ${i}. Ambiguous match.`,
        );
        return result;
      }
    }
  } catch (e) {
    console.warn("Could not read .agents from DB", e);
  }
  return result;
}

/**
 * Load a specific product's context directly (no keyword detection).
 * Used when the user has an active project selected in the workspace switcher.
 */
async function loadForcedProductContext(
  productKey: string,
): Promise<string | null> {
  try {
    const productFiles = await getFilesForProduct(productKey);
    const content = formatProductFilesToContext(productKey, productFiles);
    if (!content.trim()) return null;

    return `
CRITICAL — ACTIVE PROJECT: ${productKey}
The user has selected the "${productKey}" project as their active workspace, so EVERY response MUST be strictly grounded in this product's documentation and brand guidelines. The following information was loaded directly from the database (\`.agents/${productKey}/\`). Do NOT ask the user which product they mean — it is ${productKey}. Only discuss other products if the user explicitly asks for a comparison.

You MUST follow all product specifications, features, target audience definitions, pricing models, and brand guidelines detailed below.

--- BEGIN PRODUCT & BRAND CONTEXT ---
${content}
--- END PRODUCT & BRAND CONTEXT ---
`;
  } catch (e) {
    console.warn(`Could not load forced product context for ${productKey}`, e);
    return null;
  }
}

export async function buildProductContextBlock(
  messages?: any[],
  forcedProduct?: string | null,
  allowedProducts: string[] = [],
): Promise<string> {
  const allowed = new Set(allowedProducts);
  if (forcedProduct && allowed.has(forcedProduct)) {
    const forced = await loadForcedProductContext(forcedProduct);
    if (forced) return forced;
  }

  const { content, matchedProduct, availableFiles } =
    await getProductContext(messages, allowedProducts);

  if (!matchedProduct || content.trim().length === 0) {
    const productsList =
      availableFiles.length > 0
        ? availableFiles
            .map((name) => `- **${name}**`)
            .join("\n")
        : "- (No product projects are assigned to this workspace.)";

    return `
CRITICAL — NO PRODUCT IDENTIFIED:
I could not determine which product the user is asking about based on the conversation history.
Available products:
${productsList}

You MUST ask the user: "Which product are you asking about? I can assist you with: ${availableFiles.join(", ")}"
Do NOT provide any marketing advice or strategies until the user specifies the product.
IMPORTANT: Do NOT use webSearchTool or webScrapeTool to research these products. Their details are stored locally in .md files in the database that will be loaded automatically once the user selects one. Just ask the user to choose.
`;
  }

  return `
CRITICAL — LOADED PRODUCT & BRAND CONTEXT (${matchedProduct}):
The following information was loaded directly from the database for project \`${matchedProduct}\` (\`.agents/${matchedProduct}/\`). Use this to inform ALL your responses, strategies, copy, and recommendations. You MUST strictly adhere to these product specifications, features, target audience, pricing, and brand voice guidelines.
If there are any gaps in this context (e.g., missing competitor info, unclear pricing, or lack of target demographics), you MUST ask the user questions back and forth to fill in the blanks.

--- BEGIN PRODUCT & BRAND CONTEXT ---
${content}
--- END PRODUCT & BRAND CONTEXT ---
`;
}
