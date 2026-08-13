import { query } from "@/lib/db";

// --- AGENTS.md loader ---
export async function getAgentMdContent(): Promise<string> {
  try {
    const res = await query(
      `SELECT content FROM markdown_files WHERE file_path IN ('AGENTS.md', 'agent.md') ORDER BY file_path ASC LIMIT 1`,
    );
    if (res.rows.length > 0) {
      const content = String(res.rows[0].content || "").slice(0, 30_000);
      const parts = content.split("## Repository Structure");
      return parts[0].trim();
    }
  } catch {
    console.warn("Could not read agent configuration");
  }
  return "You are a highly capable Marketing Agent. Assist the user with product marketing research and configuration generation.";
}
