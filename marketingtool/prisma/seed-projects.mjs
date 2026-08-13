/**
 * Seed the 7 product project workspaces.
 *
 * Reads each product's research doc (.agents/<key>/product.md) from the shared
 * AiAgent `markdown_files` table and derives a brand profile from it, then:
 *   1. upserts one Workspace per product (slug + productKey = product key)
 *   2. upserts that workspace's Settings (brand profile)
 *   3. imports AiAgent `users` into the Prisma `User` table (same bcrypt hashes)
 *   4. grants project ownership to active shared administrators
 *
 * Usage: node prisma/seed-projects.mjs
 */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import pg from "pg";

// Load .env (both DATABASE_URL for Prisma and NEON_POSTREGSQL for AiAgent).
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
for (const line of readFileSync(resolve(root, ".env"), "utf8").split("\n")) {
  const match = line.match(/^([A-Z_][A-Z0-9_]*)=("?)(.*)\2\s*$/);
  if (match && !process.env[match[1]]) process.env[match[1]] = match[3];
}

const { PrismaClient } = await import("@prisma/client");
const prisma = new PrismaClient();
const aiAgentUrl = new URL(process.env.NEON_POSTREGSQL);
const aiAgentIsLocal = ["localhost", "127.0.0.1", "::1"].includes(
  aiAgentUrl.hostname,
);
const aiAgentPool = new pg.Pool({
  connectionString: process.env.NEON_POSTREGSQL,
  ssl: aiAgentIsLocal ? false : { rejectUnauthorized: true },
});

/**
 * Curated identity per product; description/website/tagline are parsed from
 * the product.md docs, with these values as fallbacks.
 */
const PROJECTS = [
  {
    key: "demo-saas",
    name: "Demo SaaS (Acme Suite)",
    website: "https://example-saas.com",
    industry: "B2B Cloud SaaS",
    defaultTone: "professional",
    brandVoice:
      "Professional, clear, modern, empowering, efficiency-oriented. The intelligent operating system for forward-thinking engineering and product teams.",
  },
  {
    key: "demo-edtech",
    name: "Demo EdTech (EduSpark)",
    website: "https://example-edtech.com",
    industry: "EdTech — Adaptive AI Learning",
    defaultTone: "empathetic",
    brandVoice:
      "Encouraging, supportive, and pedagogy-driven. Focuses on personalized learning paths and real-time tutoring feedback for students and educators.",
  },
  {
    key: "demo-ecommerce",
    name: "Demo E-Commerce (ArtisanCraft)",
    website: "https://example-ecommerce.com",
    industry: "E-Commerce — D2C Sustainable Home",
    defaultTone: "inspirational",
    brandVoice:
      "Warm, authentic, and eco-conscious. Highlights artisanal craftspeople, ethical sourcing, and sustainable living.",
  },
];

/** Pull a field like "**Website:** url" or "| **Website** | url |" from the doc. */
function extractField(doc, labels) {
  for (const label of labels) {
    const inline = doc.match(
      new RegExp(`\\*\\*${label}[:\\s]*\\*?\\*?[:\\s]*([^\\n|]+)`, "i"),
    );
    const table = doc.match(
      new RegExp(`\\|\\s*\\*\\*${label}\\*\\*\\s*\\|\\s*([^|\\n]+)`, "i"),
    );
    const raw = (table?.[1] ?? inline?.[1])?.trim();
    if (raw) return raw.replace(/^[_"'\s]+|[_"'\s]+$/g, "");
  }
  return null;
}

/** First https:// URL following any of the given labels, else null. */
function extractWebsite(doc) {
  const labeled = extractField(doc, ["Website", "URL", "Source"]);
  const fromLabel = labeled?.match(/https?:\/\/[^\s)|,]+/)?.[0];
  if (fromLabel) return fromLabel.replace(/\/$/, "");
  return null;
}

/** The "One-Line Summary" paragraph, else the first substantial paragraph. */
function extractDescription(doc) {
  const summarySection = doc.match(
    /(?:#{2,4}\s*One-Line Summary|\*\*One-Line Summary:?\*\*)\s*\n+([\s\S]+?)(?:\n\s*\n|\n#|\n---)/i,
  );
  const candidate = summarySection?.[1]?.trim();
  if (candidate) return cleanMarkdown(candidate);

  for (const block of doc.split(/\n\s*\n/)) {
    const text = block.trim();
    if (
      text.length > 120 &&
      !text.startsWith("#") &&
      !text.startsWith("|") &&
      !text.startsWith(">") &&
      !text.startsWith("-") &&
      !/^\*\*[A-Za-z ]+:\*\*/.test(text)
    ) {
      return cleanMarkdown(text);
    }
  }
  return null;
}

function cleanMarkdown(text) {
  return text
    .replace(/\*\*/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 900);
}

function nameFromEmail(email) {
  const local = email.split("@")[0] ?? "user";
  return (
    local
      .split(/[._-]+/)
      .filter(Boolean)
      .map((part) => part[0].toUpperCase() + part.slice(1))
      .join(" ") || "User"
  );
}

async function main() {
  // 1. Load product docs from the shared AiAgent DB.
  const docsRes = await aiAgentPool.query(
    "SELECT file_path, content FROM markdown_files WHERE file_path LIKE '.agents/%/product.md'",
  );
  const docs = new Map(
    docsRes.rows.map((r) => [r.file_path.split("/")[1], r.content]),
  );
  console.log(`Loaded ${docs.size} product docs:`, [...docs.keys()].join(", "));

  // 2. Upsert a workspace + brand profile per project.
  for (const project of PROJECTS) {
    const doc = docs.get(project.key) ?? "";
    if (!doc) console.warn(`⚠ No product.md found for ${project.key}`);

    // Strip parenthetical asides; when the doc's own name can't distinguish
    // the product from a sibling (e.g. docs with matching names),
    // fall back to the curated display name.
    const parsedName = extractField(doc, [
      "Product Name",
      "Brand Name",
      "Full Name",
      "Product",
    ])
      ?.replace(/\s*\([^)]*\)/g, "")
      .trim();
    const collides = PROJECTS.some(
      (other) =>
        other.key !== project.key &&
        parsedName &&
        other.name.toLowerCase().startsWith(parsedName.toLowerCase()),
    );
    const brandName = parsedName && !collides ? parsedName : project.name;
    const website = extractWebsite(doc) ?? project.website;
    const tagline = extractField(doc, ["Tagline"]);
    const description = extractDescription(doc);
    const brandDescription =
      [description, tagline ? `Tagline: "${tagline}"` : null]
        .filter(Boolean)
        .join(" — ") || null;

    const workspace = await prisma.workspace.upsert({
      where: { slug: project.key },
      update: { name: project.name, productKey: project.key },
      create: {
        name: project.name,
        slug: project.key,
        productKey: project.key,
      },
    });

    await prisma.settings.upsert({
      where: { workspaceId: workspace.id },
      update: {
        brandName,
        website,
        industry: project.industry,
        brandDescription,
        brandVoice: project.brandVoice,
        defaultTone: project.defaultTone,
      },
      create: {
        workspaceId: workspace.id,
        brandName,
        website,
        industry: project.industry,
        brandDescription,
        brandVoice: project.brandVoice,
        defaultTone: project.defaultTone,
      },
    });

    console.log(
      `✔ ${project.name} (${project.key}) — brand: ${brandName}, site: ${website}`,
    );
  }

  // 3. Import AiAgent users so the whole team can log in here with the same
  //    credentials (bcryptjs hashes are compatible between the two apps).
  const aiAgentUsers = await aiAgentPool.query(
    "SELECT email, password_hash, role FROM users WHERE deleted_at IS NULL",
  );
  let imported = 0;
  for (const row of aiAgentUsers.rows) {
    const existing = await prisma.user.findUnique({
      where: { email: row.email },
    });
    if (existing) continue;
    await prisma.user.create({
      data: {
        email: row.email,
        name: nameFromEmail(row.email),
        passwordHash: row.password_hash,
        onboardedAt: new Date(),
      },
    });
    imported += 1;
  }
  console.log(
    `✔ Imported ${imported} team members from the AiAgent users table`,
  );

  // 4. Bootstrap active shared administrators as project owners. Ordinary
  // users must be granted membership explicitly; login is not authorization.
  const adminEmails = aiAgentUsers.rows
    .filter((row) => row.role === "admin")
    .map((row) => row.email);
  const [users, projects] = await Promise.all([
    prisma.user.findMany({
      where: { email: { in: adminEmails } },
      select: { id: true },
    }),
    prisma.workspace.findMany({
      where: { productKey: { not: null } },
      select: { id: true },
    }),
  ]);
  const result = await prisma.workspaceMember.createMany({
    data: users.flatMap((user) =>
      projects.map((ws) => ({
        userId: user.id,
        workspaceId: ws.id,
        role: "OWNER",
      })),
    ),
    skipDuplicates: true,
  });
  console.log(
    `✔ Ensured owner memberships: ${users.length} admins × ${projects.length} projects (${result.count} new)`,
  );
}

try {
  await main();
} finally {
  await prisma.$disconnect();
  await aiAgentPool.end();
}
