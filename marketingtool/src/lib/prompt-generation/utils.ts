import { query } from "@/lib/db";

// --- AGENTS.md loader ---
export async function getAgentMdContent(): Promise<string> {
  try {
    const res = await query(
      `SELECT LEFT(content, 12000) AS content
       FROM markdown_files
       WHERE file_path IN ('AGENTS.md', 'agent.md')
       ORDER BY file_path ASC
       LIMIT 1`,
    );
    if (res.rows.length > 0) {
      const content = res.rows[0].content;
      const parts = content.split("## Repository Structure");
      return parts[0].trim();
    }
  } catch (e) {
    console.warn("Could not read AGENTS.md from DB", e);
  }
  return "You are a highly capable Marketing Agent. Assist the user with product marketing research and configuration generation.";
}
