"use server";

import { z } from "zod";

import { query } from "@/lib/db";
import { requireAdminIdentity } from "@/server/auth/authorization";

const MAX_SKILL_CONTENT_CHARS = 500_000;
const skillNameSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/);
const skillFilenameSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9][A-Za-z0-9_.-]*\.(?:md|json)$/i);
const skillFolderSchema = z.enum(["references", "evals"]).nullable();

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
  await requireAdminIdentity();

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

      const parsedName = skillNameSchema.safeParse(parts[1]);
      if (!parsedName.success) continue;
      const skillName = parsedName.data;
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
        const parsedFile = skillFilenameSchema.safeParse(parts[2]);
        if (parsedFile.success) {
          skill.files.push({ name: parsedFile.data, type: "file" });
        }
      } else if (parts.length === 4) {
        // Folder file e.g. skills/skillName/references/foo.md
        const folder = parts[2];
        const filename = parts[3];
        const parsedFile = skillFilenameSchema.safeParse(filename);
        if (folder === "references" && parsedFile.success) {
          skill.references.push({ name: parsedFile.data, type: "file" });
        } else if (folder === "evals" && parsedFile.success) {
          skill.evals.push({ name: parsedFile.data, type: "file" });
        }
      }
    }

    return Array.from(skillsMap.values());
  } catch (error) {
    console.error("Failed to list skills from DB:", error);
    return [];
  }
}

function getSafeFilePath(
  skillName: string,
  folder: string | null,
  filename: string,
) {
  const safeSkillName = skillNameSchema.parse(skillName);
  const safeFilename = skillFilenameSchema.parse(filename);
  const safeFolder = skillFolderSchema.parse(folder);

  if (safeFolder) {
    return `skills/${safeSkillName}/${safeFolder}/${safeFilename}`;
  }
  return `skills/${safeSkillName}/${safeFilename}`;
}

export async function readSkillFile(
  skillName: string,
  folder: string | null,
  filename: string,
) {
  await requireAdminIdentity();

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
  } catch (error) {
    console.error(
      `Failed to read skill file ${skillName}/${folder || ""}/${filename}:`,
      error,
    );
    throw new Error("File not found");
  }
}

export async function saveSkillFile(
  skillName: string,
  folder: string | null,
  filename: string,
  content: string,
) {
  await requireAdminIdentity();

  try {
    const filePath = getSafeFilePath(skillName, folder, filename);
    const safeContent = z
      .string()
      .max(MAX_SKILL_CONTENT_CHARS)
      .parse(content);
    if (/\.json$/i.test(filePath)) {
      JSON.parse(safeContent);
    }
    await query(
      `
      INSERT INTO markdown_files (file_path, content, updated_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      ON CONFLICT (file_path) DO UPDATE SET content = EXCLUDED.content, updated_at = CURRENT_TIMESTAMP;
    `,
      [filePath, safeContent],
    );
    return { success: true };
  } catch (error) {
    console.error(
      `Failed to save skill file ${skillName}/${folder || ""}/${filename}:`,
      error,
    );
    throw new Error("Failed to write file");
  }
}

export async function createSkill(skillName: string) {
  await requireAdminIdentity();
  const safeSkillName = skillNameSchema.parse(skillName);

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
  } catch (error) {
    console.error(`Failed to create skill ${skillName}:`, error);
    throw new Error("Failed to create skill");
  }
}

export async function createSkillFile(
  skillName: string,
  folder: string,
  filename: string,
) {
  await requireAdminIdentity();
  const safeSkillName = skillNameSchema.parse(skillName);
  const safeFolder = z.enum(["references", "evals"]).parse(folder);

  try {
    const rawFilename = z
      .string()
      .min(1)
      .max(123)
      .regex(/^[A-Za-z0-9][A-Za-z0-9_.-]*$/)
      .parse(filename);
    const safeFilename =
      /\.(?:md|json)$/i.test(rawFilename)
        ? rawFilename
        : `${rawFilename}.md`;
    const filePath = getSafeFilePath(
      safeSkillName,
      safeFolder,
      safeFilename,
    );

    // Check if exists
    const check = await query(
      `SELECT 1 FROM markdown_files WHERE file_path = $1`,
      [filePath],
    );
    if (check.rows.length > 0) {
      throw new Error("File already exists");
    }

    let content = "";
    if (/\.json$/i.test(safeFilename)) {
      content = "{\\n\\n}\\n";
    } else {
      content = `# ${safeFilename.replace(/\.md$/i, "")}\\n\\nContent goes here.\\n`;
    }
    await query(
      `
      INSERT INTO markdown_files (file_path, content, updated_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP)
    `,
      [filePath, content],
    );

    return { success: true, filename: safeFilename };
  } catch (error) {
    console.error("Failed to create skill file");
    throw new Error(
      error instanceof Error && error.message === "File already exists"
        ? error.message
        : "Failed to create file",
    );
  }
}
