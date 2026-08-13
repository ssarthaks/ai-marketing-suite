import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import fs from "fs/promises";
import path from "path";
import { requireRole } from "@/lib/authz";
import { rateLimit } from "@/lib/rate-limit";
import { isSameOriginRequest, safeSecretEqual } from "@/lib/server-security";

export async function POST(request: Request) {
  try {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (
      process.env.NODE_ENV === "production" &&
      process.env.ALLOW_PRODUCTION_MIGRATIONS !== "true"
    ) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const migrationSecret = process.env.MIGRATION_SECRET;
    const providedSecret = request.headers.get("x-migration-secret") || "";
    if (
      !migrationSecret ||
      migrationSecret.length < 32 ||
      !safeSecretEqual(providedSecret, migrationSecret)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const admin = await requireRole(["admin"]);
    const limit = await rateLimit(`migration:${admin.id}`, 2, 60 * 60_000);
    if (!limit.success) {
      return NextResponse.json(
        { error: "Too many migration requests" },
        { status: 429 },
      );
    }

    // 1. Create table if not exists
    await query(`
      CREATE TABLE IF NOT EXISTS markdown_files (
        file_path VARCHAR(255) PRIMARY KEY,
        content TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    let inserted = 0;

    // Helper to read file and upsert into DB
    const upsertFile = async (filePath: string, relativePath: string) => {
      try {
        const content = await fs.readFile(filePath, "utf-8");
        // Convert backslashes to forward slashes for cross-platform DB consistency
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
        console.warn("Could not migrate a configuration file");
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
      // Ignore if .agents doesn't exist
    }

    // 4. Migrate skills folder
    try {
      const skillsDir = path.join(rootDir, "skills");
      const skillsFolders = await fs.readdir(skillsDir, {
        withFileTypes: true,
      });
      for (const folder of skillsFolders) {
        if (folder.isDirectory()) {
          const skillName = folder.name;
          const skillPath = path.join(skillsDir, skillName);

          // SKILL.md
          const contents = await fs.readdir(skillPath, { withFileTypes: true });
          for (const item of contents) {
            if (item.isFile() && item.name.endsWith(".md")) {
              await upsertFile(
                path.join(skillPath, item.name),
                `skills/${skillName}/${item.name}`,
              );
            } else if (
              item.isDirectory() &&
              (item.name === "references" || item.name === "evals")
            ) {
              const subPath = path.join(skillPath, item.name);
              try {
                const subFiles = await fs.readdir(subPath, {
                  withFileTypes: true,
                });
                for (const sub of subFiles) {
                  if (sub.isFile() && sub.name.endsWith(".md")) {
                    await upsertFile(
                      path.join(subPath, sub.name),
                      `skills/${skillName}/${item.name}/${sub.name}`,
                    );
                  }
                }
              } catch {
                console.warn("Could not read an optional skill subdirectory");
              }
            }
          }
        }
      }
    } catch (e) {
      // Ignore if skills doesn't exist
    }

    return NextResponse.json(
      {
        success: true,
        message: `Migrated ${inserted} markdown files to DB.`,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    console.error("Migration request failed");
    return NextResponse.json(
      { success: false, error: "Migration failed" },
      { status: 500 },
    );
  }
}
