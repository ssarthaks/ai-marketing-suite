"use server";

import { deepseekChat } from "./deepseek";
import { openaiChat } from "./openai";
import { claudeChat } from "./claude";
import { geminiChat } from "./gemini";

/**
 * Universal multi-LLM chat handler.
 * Seamlessly dispatches requests to DeepSeek, OpenAI, Claude, or Gemini
 * with automatic provider fallback if a specific API key is missing.
 */
export async function aiAgentChatRouter({ data }: { data: any }) {
  const model = data?.model || "deepseek-v4-flash";

  // Identify requested provider
  if (model.startsWith("gpt") || model.includes("openai")) {
    const hasOpenAi = !!(process.env.OPENAI_API_KEY || process.env.OPENAI_KEY);
    if (hasOpenAi) return openaiChat({ data });
  }

  if (model.startsWith("claude") || model.includes("anthropic")) {
    const hasClaude = !!(process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_KEY);
    if (hasClaude) return claudeChat({ data });
  }

  if (model.startsWith("gemini") || model.includes("google")) {
    const hasGemini = !!(process.env.GEMINI_API_KEY || process.env.GEMINI_KEY);
    if (hasGemini) return geminiChat({ data });
  }

  if (model.startsWith("deepseek")) {
    const hasDeepSeek = !!process.env.DEEPSEEK_API_KEY;
    if (hasDeepSeek) return deepseekChat({ data });
  }

  // Automatic Fallback Strategy: try available API keys in sequence
  if (process.env.DEEPSEEK_API_KEY) {
    return deepseekChat({ data: { ...data, model: "deepseek-v4-flash" } });
  }
  if (process.env.OPENAI_API_KEY || process.env.OPENAI_KEY) {
    return openaiChat({ data: { ...data, model: "gpt-4o-mini" } });
  }
  if (process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_KEY) {
    return claudeChat({ data: { ...data, model: "claude-3-5-sonnet-20241022" } });
  }
  if (process.env.GEMINI_API_KEY || process.env.GEMINI_KEY) {
    return geminiChat({ data: { ...data, model: "gemini-2.5-flash" } });
  }

  // If no provider keys configured at all, invoke default handler to produce clean error
  return deepseekChat({ data });
}

export { deepseekChat, openaiChat, claudeChat, geminiChat };
