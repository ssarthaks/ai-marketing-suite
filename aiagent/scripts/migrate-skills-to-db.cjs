/**
 * Migrate all skill files (skills/<name>/SKILL.md, references/*.md, evals/*.json)
 * into the markdown_files table the AI agent reads at runtime.
 *
 * Usage: node scripts/migrate-skills-to-db.cjs
 */
const fs = require("fs/promises");
const path = require("path");
const { Pool } = require("pg");
const { loadEnvConfig } = require("@next/env");

const projectDir = process.cwd();
loadEnvConfig(projectDir);

if (
  process.env.NODE_ENV === "production" &&
  process.env.ALLOW_PRODUCTION_MIGRATIONS !== "true"
) {
  throw new Error("Refusing to modify a production database without approval");
}

if (!process.env.NEON_POSTREGSQL) {
  throw new Error("Missing NEON_POSTREGSQL environment variable");
}

const databaseUrl = new URL(process.env.NEON_POSTREGSQL);
for (const parameter of ["sslmode", "sslcert", "sslkey", "sslrootcert"]) {
  databaseUrl.searchParams.delete(parameter);
}

const pool = new Pool({
  connectionString: databaseUrl.toString(),
  ssl: { rejectUnauthorized: true },
  connectionTimeoutMillis: 10000,
  statement_timeout: 30000,
});

async function main() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS markdown_files (
      file_path VARCHAR(255) PRIMARY KEY,
      content TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const skillsDir = path.join(projectDir, "skills");
  const skillFolders = await fs.readdir(skillsDir, { withFileTypes: true });

  let upserted = 0;
  const upsertFile = async (absPath, relPath) => {
    const content = await fs.readFile(absPath, "utf-8");
    await pool.query(
      `INSERT INTO markdown_files (file_path, content, updated_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (file_path) DO UPDATE
         SET content = EXCLUDED.content, updated_at = CURRENT_TIMESTAMP;`,
      [relPath.replace(/\\/g, "/"), content],
    );
    upserted++;
    console.log(`  upserted ${relPath}`);
  };

  for (const folder of skillFolders) {
    if (!folder.isDirectory()) continue;
    const skillName = folder.name;
    const skillPath = path.join(skillsDir, skillName);
    const entries = await fs.readdir(skillPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith(".md")) {
        await upsertFile(
          path.join(skillPath, entry.name),
          `skills/${skillName}/${entry.name}`,
        );
      } else if (
        entry.isDirectory() &&
        (entry.name === "references" || entry.name === "evals")
      ) {
        const subPath = path.join(skillPath, entry.name);
        const subFiles = await fs.readdir(subPath, { withFileTypes: true });
        for (const sub of subFiles) {
          if (
            sub.isFile() &&
            (sub.name.endsWith(".md") || sub.name.endsWith(".json"))
          ) {
            await upsertFile(
              path.join(subPath, sub.name),
              `skills/${skillName}/${entry.name}/${sub.name}`,
            );
          }
        }
      }
    }
  }

  const check = await pool.query(
    `SELECT count(*)::int AS files,
            count(*) FILTER (WHERE file_path LIKE '%/SKILL.md')::int AS skill_mds,
            max(updated_at) AS last_update
     FROM markdown_files WHERE file_path LIKE 'skills/%'`,
  );
  console.log(`\nDone. Upserted ${upserted} files this run.`);
  console.log(
    `DB now holds ${check.rows[0].files} skill files (${check.rows[0].skill_mds} SKILL.md), last update ${check.rows[0].last_update}`,
  );
}

main()
  .then(() => pool.end())
  .catch((err) => {
    console.error("Migration failed:", err.message);
    pool.end();
    process.exit(1);
  });
