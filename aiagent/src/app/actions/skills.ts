"use server";

import { requireRole } from "@/lib/authz";
import { query } from "@/lib/db";
import path from "path";
import { identifierSchema } from "@/lib/validation";

const EDITOR_ROLES = ["admin", "team_lead"] as const;
const MAX_FILE_CONTENT_LENGTH = 1_000_000;

export type SkillFileInfo = {
  name: string;
  type: "file" | "directory";
};

export type SkillTree = {
  name: string;
  files: SkillFileInfo[];
  references: SkillFileInfo[];
  evals: SkillFileInfo[];
};

export async function listSkills(): Promise<SkillTree[]> {
  await requireRole(EDITOR_ROLES);

  try {
    const res = await query(
      `SELECT file_path FROM markdown_files WHERE file_path LIKE 'skills/%'`,
    );
    const paths = res.rows.map((r) => r.file_path);

    const skillsMap = new Map<string, SkillTree>();

    for (const p of paths) {
      // p format: skills/skillName/filename.md or skills/skillName/folder/filename.md
      const parts = p.split("/");
      if (parts.length < 3) continue;

      const skillName = parts[1];
      if (!skillsMap.has(skillName)) {
        skillsMap.set(skillName, {
          name: skillName,
          files: [],
          references: [],
          evals: [],
        });
      }

      const skill = skillsMap.get(skillName)!;

      if (parts.length === 3) {
        // Root file e.g. skills/skillName/SKILL.md
        skill.files.push({ name: parts[2], type: "file" });
      } else if (parts.length === 4) {
        // Folder file e.g. skills/skillName/references/foo.md
        const folder = parts[2];
        const filename = parts[3];
        if (folder === "references") {
          skill.references.push({ name: filename, type: "file" });
        } else if (folder === "evals") {
          skill.evals.push({ name: filename, type: "file" });
        }
      }
    }

    return Array.from(skillsMap.values());
  } catch {
    console.error("Failed to list skills");
    return [];
  }
}

function getSafeFilePath(
  skillName: string,
  folder: string | null,
  filename: string,
) {
  const safeSkillName = identifierSchema.parse(skillName);
  const safeFilename = path.basename(filename);

  if (
    safeFilename !== filename ||
    !/^[A-Za-z0-9_.-]{1,100}\.(md|json)$/.test(safeFilename) ||
    safeFilename.includes("..")
  ) {
    throw new Error("Invalid file type. Only .md and .json files are allowed.");
  }

  if (folder && folder !== "references" && folder !== "evals") {
    throw new Error(
      "Invalid folder type. Only references and evals are allowed.",
    );
  }

  if (folder) {
    return `skills/${safeSkillName}/${folder}/${safeFilename}`;
  }
  return `skills/${safeSkillName}/${safeFilename}`;
}

export async function readSkillFile(
  skillName: string,
  folder: string | null,
  filename: string,
) {
  await requireRole(EDITOR_ROLES);

  try {
    const filePath = getSafeFilePath(skillName, folder, filename);
    const res = await query(
      `SELECT content FROM markdown_files WHERE file_path = $1`,
      [filePath],
    );
    if (res.rows.length === 0) {
      throw new Error("File not found in DB");
    }
    return res.rows[0].content;
  } catch {
    console.error("Failed to read skill file");
    throw new Error("File not found");
  }
}

export async function saveSkillFile(
  skillName: string,
  folder: string | null,
  filename: string,
  content: string,
) {
  await requireRole(EDITOR_ROLES);
  if (typeof content !== "string" || content.length > MAX_FILE_CONTENT_LENGTH) {
    throw new Error("File content is too large");
  }

  try {
    const filePath = getSafeFilePath(skillName, folder, filename);
    await query(
      `
      INSERT INTO markdown_files (file_path, content, updated_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      ON CONFLICT (file_path) DO UPDATE SET content = EXCLUDED.content, updated_at = CURRENT_TIMESTAMP;
    `,
      [filePath, content],
    );
    return { success: true };
  } catch {
    console.error("Failed to save skill file");
    throw new Error("Failed to write file");
  }
}

export async function createSkill(skillName: string) {
  await requireRole(EDITOR_ROLES);
  const safeSkillName = identifierSchema.parse(skillName);

  try {
    const filePath = `skills/${safeSkillName}/SKILL.md`;
    const content = `# ${safeSkillName}\\n\\nDescription of the skill goes here.\\n`;
    await query(
      `
      INSERT INTO markdown_files (file_path, content, updated_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      ON CONFLICT (file_path) DO NOTHING;
    `,
      [filePath, content],
    );
    return { success: true };
  } catch {
    console.error("Failed to create skill");
    throw new Error("Failed to create skill");
  }
}

export async function createSkillFile(
  skillName: string,
  folder: string,
  filename: string,
) {
  await requireRole(EDITOR_ROLES);

  if (folder !== "references" && folder !== "evals") {
    throw new Error("Invalid folder. Must be references or evals");
  }

  try {
    const safeFilename =
      filename.endsWith(".md") || filename.endsWith(".json")
        ? filename
        : `${filename}.md`;
    const filePath = getSafeFilePath(skillName, folder, safeFilename);

    // Check if exists
    const check = await query(
      `SELECT 1 FROM markdown_files WHERE file_path = $1`,
      [filePath],
    );
    if (check.rows.length > 0) {
      throw new Error("File already exists");
    }

    let content = "";
    if (safeFilename.endsWith(".json")) {
      content = "{\\n\\n}\\n";
    } else {
      content = `# ${path.basename(safeFilename, ".md")}\\n\\nContent goes here.\\n`;
    }
    await query(
      `
      INSERT INTO markdown_files (file_path, content, updated_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP)
    `,
      [filePath, content],
    );

    return { success: true, filename: safeFilename };
  } catch (error: unknown) {
    console.error("Failed to create skill file");
    throw new Error(
      error instanceof Error && error.message === "File already exists"
        ? error.message
        : "Failed to create file",
    );
  }
}
