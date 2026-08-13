import pkg from "pg";
const { Pool } = pkg;
import fs from "fs/promises";
import path from "path";
import { getDatabaseConfig } from "./db-config";

async function run() {
  try {
    const pool = new Pool({
      ...(await getDatabaseConfig()),
      connectionTimeoutMillis: 5_000,
      statement_timeout: 30_000,
    });

    const query = (text: string, params?: unknown[]) =>
      pool.query(text, params);

    // 1. Create tables if not exists
    await query(`
      CREATE TABLE IF NOT EXISTS markdown_files (
        file_path VARCHAR(255) PRIMARY KEY,
        content TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Markdown files table verified.");

    await query(`
      CREATE TABLE IF NOT EXISTS password_resets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Password resets table verified.");

    let inserted = 0;

    const upsertFile = async (absolutePath: string, relativePath: string) => {
      try {
        const content = await fs.readFile(absolutePath, "utf-8");
        const normalizedPath = relativePath.replace(/\\/g, "/");

        await query(
          `
          INSERT INTO markdown_files (file_path, content, updated_at)
          VALUES ($1, $2, CURRENT_TIMESTAMP)
          ON CONFLICT (file_path) DO UPDATE SET content = EXCLUDED.content, updated_at = CURRENT_TIMESTAMP;
        `,
          [normalizedPath, content],
        );
        inserted++;
      } catch {
        console.error("Could not migrate a configuration file");
      }
    };

    const insertMissingFile = async (
      absolutePath: string,
      relativePath: string,
    ) => {
      try {
        const content = await fs.readFile(absolutePath, "utf-8");
        const normalizedPath = relativePath.replace(/\\/g, "/");

        const result = await query(
          `
          INSERT INTO markdown_files (file_path, content, updated_at)
          VALUES ($1, $2, CURRENT_TIMESTAMP)
          ON CONFLICT (file_path) DO NOTHING;
        `,
          [normalizedPath, content],
        );

        if (result.rowCount && result.rowCount > 0) {
          inserted++;
          console.log(`Seeded missing file: ${normalizedPath}`);
        }
      } catch {
        console.error("Could not seed a configuration file");
      }
    };

    const rootDir = process.cwd();

    // 2. Migrate AGENTS.md / agent.md
    await upsertFile(path.join(rootDir, "AGENTS.md"), "AGENTS.md");
    await upsertFile(path.join(rootDir, "agent.md"), "agent.md");

    // 3. Migrate .agents folder
    try {
      const agentsDir = path.join(rootDir, ".agents");

      const processAgentsDir = async (
        dirPath: string,
        relativePath: string,
      ) => {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);
          const newRelPath = path.posix.join(relativePath, entry.name);

          if (entry.isDirectory()) {
            await processAgentsDir(fullPath, newRelPath);
          } else if (entry.isFile() && entry.name.endsWith(".md")) {
            await upsertFile(fullPath, newRelPath);
          }
        }
      };

      await processAgentsDir(agentsDir, ".agents");
    } catch (e) {
      // Ignore
    }

    // 4. Migrate skills folder
    try {
      const skillsDir = path.join(rootDir, "skills");

      const processDir = async (dirPath: string, relativePath: string) => {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);
          const newRelPath = path.posix.join(relativePath, entry.name);

          if (entry.isDirectory()) {
            await processDir(fullPath, newRelPath);
          } else if (
            entry.isFile() &&
            (entry.name.endsWith(".md") || entry.name.endsWith(".json"))
          ) {
            await upsertFile(fullPath, newRelPath);
          }
        }
      };

      await processDir(skillsDir, "skills");
    } catch (e) {
      // Ignore
    }

    console.log(
      `Successfully migrated ${inserted} markdown files to Neon PostgreSQL.`,
    );
    process.exit(0);
  } catch {
    console.error("Migration failed");
    process.exit(1);
  }
}

run();
