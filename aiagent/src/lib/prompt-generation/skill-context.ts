import { query } from "@/lib/db";
import type { PromptMessage } from "./product-context";

export function getRelevantSkills(
  messages?: readonly PromptMessage[],
): string[] {
  if (!messages || messages.length === 0) return [];

  const userMessages = messages.filter((m) => m.role === "user");
  const activeSkills = new Set<string>();

  // Iterate backwards to find the most recently requested skill
  for (let i = userMessages.length - 1; i >= 0; i--) {
    const text = userMessages[i].content.toLowerCase();

    if (text.match(/research|product|feature/i))
      activeSkills.add("product-research");
    if (text.match(/competitor|market gap/i))
      activeSkills.add("competitors-research");
    if (text.match(/seo|keyword|cluster/i)) activeSkills.add("ai-seo");
    if (text.match(/content|blog|roadmap/i))
      activeSkills.add("content-strategy");
    if (text.match(/campaign|growth hack/i))
      activeSkills.add("marketing-ideas");
    if (text.match(/positioning|launch|persona/i))
      activeSkills.add("product-marketing");
    if (text.match(/plan|roadmap|strategy/i))
      activeSkills.add("marketing-plan");
    if (text.match(/ad |ads |ppc/i)) activeSkills.add("ads");
    if (text.match(/creative|copy|headline/i)) activeSkills.add("ad-creative");
    if (text.match(/partner|joint/i)) activeSkills.add("co-marketing");
    if (text.match(/community|slack|discord/i))
      activeSkills.add("community-marketing");
    if (text.match(/psychology|bias|behavior/i))
      activeSkills.add("marketing-psychology");
    if (text.match(/brand strategy|archetype|brand voice|tone of voice/i))
      activeSkills.add("brand-strategy");
    if (text.match(/tagline|aida|pas|copywriting|creative copy/i))
      activeSkills.add("creative-copylines");
    if (text.match(/positioning|value proposition|market gap/i))
      activeSkills.add("brand-positioning");
    if (
      text.match(
        /market research|tam sam|market size|market analysis|market opportunity|market landscape|market sizing/i,
      )
    )
      activeSkills.add("market-research");
    if (
      text.match(
        /market entry|enter.*market|new market|expand.*market|launch.*country|geographic expansion|market expansion/i,
      )
    )
      activeSkills.add("market-entry");
    if (
      text.match(
        /edtech marketing|education marketing|student acquisition|school marketing|teacher marketing|learning platform marketing|educational technology/i,
      )
    )
      activeSkills.add("edtech-marketing");
    if (
      text.match(
        /communication strategy|messaging framework|stakeholder communication|press release|media relations|brand communication|message map|pr strategy|public relations/i,
      )
    )
      activeSkills.add("market-communication");
    if (
      text.match(
        /video storyboard|storyboard|video script|video ad|reel script|youtube script|tiktok script|explainer video/i,
      )
    )
      activeSkills.add("video-storyboard");
    if (text.match(/seo audit|technical seo check/i))
      activeSkills.add("seo-site-auditor");
    if (text.match(/optimize for ai search|answer engine optimization|aeo/i))
      activeSkills.add("aeo-content-optimizer");
    if (text.match(/schema markup|json-ld/i))
      activeSkills.add("schema-markup-generator");
    if (text.match(/e-e-a-t score|content quality check|eeat/i))
      activeSkills.add("eeat-content-scorer");
    if (text.match(/keyword intent|search intent classification/i))
      activeSkills.add("keyword-intent-classifier");
    if (text.match(/competitor content gap|semantic gaps/i))
      activeSkills.add("competitor-gap-finder");
    if (text.match(/gbp post|google business profile/i))
      activeSkills.add("gbp-post-generator");
    if (text.match(/internal linking strategy|topical authority map/i))
      activeSkills.add("internal-linking-strategist");
    if (text.match(/seo content brief|writer brief/i))
      activeSkills.add("seo-content-brief-writer");
    if (text.match(/ai search visibility|aeo readiness audit/i))
      activeSkills.add("ai-search-visibility-checker");

    // If we found at least one skill trigger in this message, stop looking backward.
    // This prevents old conversation topics from keeping their skills loaded.
    if (activeSkills.size > 0) {
      break;
    }
  }

  return Array.from(activeSkills);
}

export async function loadRelevantSkills(
  messages?: readonly PromptMessage[],
): Promise<string> {
  const relevantSkillNames = getRelevantSkills(messages);
  if (relevantSkillNames.length === 0) {
    return ""; // No specific skills triggered, return empty to use generic directory fallback
  }

  const skillEntries: string[] = [];

  try {
    for (const skillName of relevantSkillNames) {
      const res = await query(
        `SELECT content FROM markdown_files WHERE file_path = $1`,
        [`skills/${skillName}/SKILL.md`],
      );
      if (res.rows.length > 0) {
        const content = String(res.rows[0].content || "").slice(0, 40_000);
        skillEntries.push(`\n### SKILL: ${skillName}\n${content}`);
      }
    }
  } catch {
    console.warn("Could not read skill configuration");
  }

  return skillEntries.join("\n\n---\n");
}

export async function buildSkillsBlock(
  messages?: readonly PromptMessage[],
): Promise<string> {
  const loadedSkillsText = await loadRelevantSkills(messages);

  // If no skills triggered, just provide the routing table so the AI knows they exist
  const skillsContent = loadedSkillsText
    ? `\n--- BEGIN SKILL INSTRUCTIONS ---\n${loadedSkillsText}\n--- END SKILL INSTRUCTIONS ---\n`
    : `\n*No specific skill detected. Ask the user what they want to do so you can load the relevant skill next turn.*\n`;

  return `
## YOUR SKILL LIBRARY

You have access to 30 specialized marketing skills. When a user's request matches a skill, you MUST follow that skill's specific workflow, templates, and output formats — not generic advice. Each skill below contains detailed instructions, templates, quality standards, and output formats you must use.

### SKILL ROUTING — Match user intent to the correct skill:

| User Intent | Primary Skill | Secondary Skill |
|-------------|---------------|-----------------|
| "Research our own product / features" | product-research | product-marketing |
| "Who are our competitors / market gaps" | competitors-research | marketing-ideas |
| "SEO, keywords, content clusters, AI search" | ai-seo | content-strategy |
| "Content planning, pillars, blog roadmap" | content-strategy | ai-seo |
| "Brand strategy, archetypes, tone of voice" | brand-strategy | brand-positioning |
| "Taglines, copy frameworks, creative copy" | creative-copylines | product-marketing |
| "Positioning statement, value proposition, market gaps" | brand-positioning | competitors-research |
| "Campaign ideas, growth hacks" | marketing-ideas | marketing-plan |
| "Positioning, launch, personas, messaging" | product-marketing | — |
| "Full strategy / plan / roadmap" | marketing-plan | All others |
| "Paid ads, PPC campaigns, PPC strategy" | ads | ad-creative |
| "Ad copy, headlines, creative variations" | ad-creative | ads |
| "Joint campaigns, partner marketing" | co-marketing | marketing-ideas |
| "Slack/Discord community, brand advocates" | community-marketing | marketing-ideas |
| "Behavioral science, biases, why they buy" | marketing-psychology | — |
| "Market research, TAM/SAM/SOM, market sizing, market landscape" | market-research | competitors-research |
| "Market entry, enter new country, geographic expansion, new market strategy" | market-entry | market-research |
| "EdTech marketing, student acquisition, school marketing, education technology" | edtech-marketing | marketing-plan |
| "Communication strategy, messaging framework, PR, press release, message map" | market-communication | brand-positioning |
| "Video storyboard, video script, TikTok script, YouTube script, explainer video" | video-storyboard | ad-creative |
| "SEO audit, technical SEO check" | seo-site-auditor | ai-seo |
| "Optimize for AI search, Answer Engine Optimization" | aeo-content-optimizer | ai-search-visibility-checker |
| "Schema markup, JSON-LD structured data" | schema-markup-generator | seo-site-auditor |
| "E-E-A-T score, content quality check" | eeat-content-scorer | seo-content-brief-writer |
| "Keyword intent, search intent classification" | keyword-intent-classifier | ai-seo |
| "Competitor content gap, semantic gaps" | competitor-gap-finder | competitors-research |
| "GBP post, Google Business Profile" | gbp-post-generator | marketing-ideas |
| "Internal linking strategy, topical authority map" | internal-linking-strategist | ai-seo |
| "SEO content brief, writer brief" | seo-content-brief-writer | content-strategy |
| "AI search visibility, AEO readiness audit" | ai-search-visibility-checker | aeo-content-optimizer |

RULES FOR USING SKILLS:
1. When a user request matches a skill, follow that skill's FULL workflow — intake questions, research steps, output template, and quality standards.
2. If a request spans multiple skills, load both and synthesize (e.g., "create paid ads" → use ad-creative skill's templates + ads skill's targeting strategy).
3. The marketing-plan skill is the ORCHESTRATOR — use it whenever the user wants a holistic strategy.
4. Every skill says to check .agents/product-marketing.md first — you already have this loaded as Product Context above. If it lacks detail, ask the user!
5. Follow each skill's specific output format (tables, CSV layouts, templates, etc.) rather than giving generic prose.
${skillsContent}
`;
}
