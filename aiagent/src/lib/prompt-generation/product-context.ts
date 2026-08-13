import { query } from "@/lib/db";

const SAFE_PRODUCT_KEY = /^[A-Za-z0-9_-]{1,80}$/;
const MAX_PRODUCT_CONTEXT_CHARACTERS = 120_000;
const MAX_PRODUCT_FILES = 25;

export type PromptMessage = {
  role: "user" | "assistant";
  content: string;
};

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

async function getFilesForProduct(
  productKey: string,
): Promise<{ filePath: string; content: string }[]> {
  if (!SAFE_PRODUCT_KEY.test(productKey)) return [];
  try {
    const prefix = `.agents/${productKey}/`;
    const res = await query(
      `SELECT file_path, content
       FROM markdown_files
       WHERE LEFT(file_path, LENGTH($1)) = $1
       ORDER BY file_path ASC
       LIMIT $2`,
      [prefix, MAX_PRODUCT_FILES],
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

function formatProductFilesToContext(
  productKey: string,
  files: { filePath: string; content: string }[],
): string {
  if (!files || files.length === 0) return "";

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
  return context.length <= MAX_PRODUCT_CONTEXT_CHARACTERS
    ? context
    : `${context.slice(0, MAX_PRODUCT_CONTEXT_CHARACTERS)}\n\n[Product context truncated]`;
}

export async function buildProductContextBlock(
  messages?: readonly PromptMessage[],
  forcedProduct?: string | null,
  allowedProducts: string[] = [],
): Promise<string> {
  const files = [
    ...new Set(
      allowedProducts.filter((product) => SAFE_PRODUCT_KEY.test(product)),
    ),
  ];
  if (files.length === 0) return "";

  if (forcedProduct && SAFE_PRODUCT_KEY.test(forcedProduct)) {
    const productFiles = await getFilesForProduct(forcedProduct);
    const content = formatProductFilesToContext(forcedProduct, productFiles);
    if (content.trim()) {
      return `
CRITICAL — ACTIVE PROJECT: ${forcedProduct}
The user has selected "${forcedProduct}" as their active project. Every response MUST be strictly grounded in this product's documentation.

--- BEGIN PRODUCT & BRAND CONTEXT ---
${content}
--- END PRODUCT & BRAND CONTEXT ---
`;
    }
  }

  if (!messages || messages.length === 0) return "";

  const userMessages = messages.filter((m) => m.role === "user");

  for (let i = userMessages.length - 1; i >= 0; i--) {
    const rawText = userMessages[i].content.toLowerCase();
    const normalizedText = normalizeString(rawText);
    const matches = new Set<string>();

    for (const file of files) {
      const normalizedFile = normalizeString(file);

      if (
        rawText.includes(file.toLowerCase()) ||
        normalizedText.includes(normalizedFile)
      ) {
        matches.add(file);
        continue;
      }

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

    if (matches.size === 1) {
      const matchedFile = Array.from(matches)[0];
      const productFiles = await getFilesForProduct(matchedFile);
      const content = formatProductFilesToContext(matchedFile, productFiles);

      return `
CRITICAL — LOADED PRODUCT & BRAND CONTEXT (${matchedFile}):
The following information was loaded for project \`${matchedFile}\`. Adhere strictly to these product specifications.

--- BEGIN PRODUCT & BRAND CONTEXT ---
${content}
--- END PRODUCT & BRAND CONTEXT ---
`;
    }
  }

  return "";
}
