import { format, formatDistanceToNow } from "date-fns";

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return format(new Date(date), "MMM d, yyyy");
}

export function formatDateRange(
  start: Date | string | null | undefined,
  end: Date | string | null | undefined
): string {
  if (!start && !end) return "No dates set";
  if (start && !end) return `From ${formatDate(start)}`;
  if (!start && end) return `Until ${formatDate(end)}`;
  return `${formatDate(start)} – ${formatDate(end)}`;
}

export function formatRelative(date: Date | string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );
  const value = bytes / 1024 ** index;
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US", { notation: "compact" }).format(value);
}

export function stripMarkdown(markdown: string): string {
  if (!markdown) return "";
  return markdown
    .replace(/^#+\s+/gm, "") // remove heading syntax # ## ###
    .replace(/(\*\*|__)(.*?)\1/g, "$2") // remove bold **text**
    .replace(/(\*|_)(.*?)\1/g, "$2") // remove italics *text*
    .replace(/`{1,3}(.*?)`{1,3}/g, "$1") // remove inline code `code`
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // remove markdown links [text](url)
    .replace(/\|?\s*[-:]{2,}\s*\|?/g, " ") // remove table divider rows |---|---|
    .replace(/\|/g, " ") // replace table pipe separators | with space
    .replace(/^\s*[-*+]\s+/gm, "") // remove bullet list markers
    .replace(/\n+/g, " ") // collapse newlines into spaces
    .replace(/\s{2,}/g, " ") // collapse multiple spaces
    .trim();
}

export function getPlainTextContent(content: string): string {
  if (!content) return "";
  const formatted = formatContentToMarkdown(content);
  return formatted
    .replace(/^#+\s+/gm, "") // remove heading syntax # ## ###
    .replace(/(\*\*|__)(.*?)\1/g, "$2") // remove bold **text**
    .replace(/(\*|_)(.*?)\1/g, "$2") // remove italics *text*
    .replace(/`{1,3}(.*?)`{1,3}/g, "$1") // remove inline code `code`
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // remove markdown links [text](url)
    .replace(/\|?\s*[-:]{2,}\s*\|?/g, "") // remove table divider rows |---|---|
    .replace(/\|/g, " ") // replace table pipe separators | with space
    .replace(/^\s*[-*+]\s+/gm, "• ") // format bullet list markers
    .replace(/\n{3,}/g, "\n\n") // normalize multiple blank lines
    .trim();
}

export function formatContentToMarkdown(content: string): string {
  if (!content) return "";
  const trimmed = content.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsed = JSON.parse(trimmed);

      // Current specialist records use Markdown built locally from a strict,
      // role-owned schema. No heuristic field matching is needed.
      if (
        parsed.schemaVersion === 2 &&
        parsed.rawMarkdown &&
        typeof parsed.rawMarkdown === "string"
      ) {
        return parsed.rawMarkdown;
      }

      // Preserve pre-v2 saved records that already contain rendered Markdown.
      if (parsed.rawMarkdown && typeof parsed.rawMarkdown === "string") {
        return parsed.rawMarkdown;
      }

      // Legacy email records did not persist rawMarkdown.
      if (parsed.emails && Array.isArray(parsed.emails)) {
        let md = `# ${parsed.campaignName || "Email Drip Campaign"}\n\n`;
        parsed.emails.forEach((email: any, index: number) => {
          md += `### Email ${index + 1}: ${email.purpose || email.stage || `Step ${index + 1}`}\n`;
          if (email.sendDelay) md += `**Send:** ${email.sendDelay}\n`;
          if (email.subjectA) md += `**Subject Line A:** ${email.subjectA}\n`;
          if (email.subjectB) md += `**Subject Line B:** ${email.subjectB}\n`;
          if (email.previewText) md += `**Preview Text:** ${email.previewText}\n`;
          if (email.body) md += `\n${email.body}\n`;
          if (email.ctaText) md += `\n**CTA Button:** [ ${email.ctaText} ]\n`;
          md += `\n---\n\n`;
        });
        return md.trim();
      }

      // Generic JSON formatting: convert key-values into markdown headings and text
      let genericMd = "";
      for (const [key, val] of Object.entries(parsed)) {
        if (key === "tokensUsed" || key === "model") continue;
        const title = key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase());
        if (typeof val === "string") {
          genericMd += `### ${title}\n${val}\n\n`;
        } else if (Array.isArray(val)) {
          genericMd += `### ${title}\n` + val.map((v) => `- ${typeof v === "object" ? JSON.stringify(v) : v}`).join("\n") + "\n\n";
        } else if (typeof val === "object" && val !== null) {
          genericMd += `### ${title}\n\`\`\`json\n${JSON.stringify(val, null, 2)}\n\`\`\`\n\n`;
        } else {
          genericMd += `**${title}:** ${val}\n\n`;
        }
      }
      if (genericMd.trim()) return genericMd.trim();
    } catch {
      // Fallback to raw string
    }
  }
  return content;
}

export function getReadableContentText(content: string): string {
  if (!content) return "";
  return stripMarkdown(formatContentToMarkdown(content));
}

export function getProjectBadgeLabel(item: { prompt?: string | null; title?: string | null; content?: string | null }): string | null {
  const text = `${item.title || ""} ${item.prompt || ""} ${item.content || ""}`.toLowerCase();
  if (text.includes("demo-saas") || text.includes("acme")) return "🎯 Demo SaaS";
  if (text.includes("demo-edtech") || text.includes("eduspark")) return "🎯 Demo EdTech";
  if (text.includes("demo-ecommerce") || text.includes("artisancraft")) return "🎯 Demo E-Commerce";
  return "🎯 General Product";
}
