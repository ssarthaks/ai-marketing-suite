"use server";

import { z } from "zod";
import { webSearchTool, webScrapeTool } from "../tools";
import { getMarketingSystemPrompt } from "../prompt-generation";
import { formatToolResult, sanitizeModelResponse } from "../utils";

import {
  acquireAiRequestSlot,
  assertTotalMessageSize,
  authorizeAiRequest,
  limitAiOutput,
  openAiCompatiblePayloadSchema,
  safeChatMessageSchema,
} from "./ai-security";
import { readResponseText } from "@/lib/network-security";
import { recordSharedUsageBestEffort } from "@/server/ai/shared-usage";

async function runOpenaiChat({
  data,
}: {
  data: { messages: any[]; temperature?: number };
}, identity: Awaited<ReturnType<typeof authorizeAiRequest>>) {
  // Validate input
  const validated = z
    .object({
      messages: z.array(safeChatMessageSchema).min(1).max(40),
      temperature: z.number().min(0).max(2).optional(),
    })
    .strict()
    .parse(data);
  assertTotalMessageSize(validated.messages);

  const apiKey = process.env.OPENAI_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_KEY in server environment.");
  }

  const systemMessage = {
    role: "system",
    content: await getMarketingSystemPrompt(validated.messages),
  };

  const apiMessages = [systemMessage, ...validated.messages];

  const tools = [
    {
      type: "function",
      function: {
        name: "webSearchTool",
        description:
          "Search the web for information to assist with product marketing research.",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string", description: "The search query" },
          },
          required: ["query"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "webScrapeTool",
        description: "Scrape and extract raw text content from a web page/URL.",
        parameters: {
          type: "object",
          properties: {
            url: {
              type: "string",
              description: "The URL of the web page to scrape",
            },
          },
          required: ["url"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "generateMarketingFilesTool",
        description: "Generate marketing agent configuration files.",
        parameters: {
          type: "object",
          properties: {
            projectName: { type: "string" },
            agentContent: { type: "string" },
            skills: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  description: { type: "string" },
                  content: { type: "string" },
                },
                required: ["name", "description", "content"],
              },
            },
            evalsJson: { type: "string" },
          },
          required: ["projectName", "agentContent", "skills", "evalsJson"],
        },
      },
    },
  ];

  const currentMessages: any[] = [...apiMessages];
  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;

  for (let step = 0; step < 4; step++) {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: currentMessages,
        temperature: validated.temperature ?? 0.7,
        max_tokens: 4096,
        tools: tools,
        tool_choice: "auto",
      }),
      signal: AbortSignal.timeout(20_000),
    });

    const payload = openAiCompatiblePayloadSchema.parse(
      JSON.parse(
        await readResponseText(response, 2 * 1024 * 1024).catch(() => "{}"),
      ),
    );

    if (!response.ok) {
      throw new Error(`OpenAI API request failed (${response.status})`);
    }

    if (payload.usage) {
      totalPromptTokens += payload.usage.prompt_tokens || 0;
      totalCompletionTokens += payload.usage.completion_tokens || 0;
    }
    await recordSharedUsageBestEffort({
      userId: identity.id,
      model: "gpt-4o-mini",
      promptTokens: payload.usage?.prompt_tokens ?? 0,
      completionTokens: payload.usage?.completion_tokens ?? 0,
    });

    const message = payload.choices?.[0]?.message;
    if (!message) {
      throw new Error("OpenAI API returned an empty response.");
    }

    currentMessages.push(message);

    if (message.tool_calls && message.tool_calls.length > 0) {
      if (message.tool_calls.length > 3) {
        throw new Error("The AI requested too many tools at once");
      }
      for (const toolCall of message.tool_calls) {
        if (toolCall.type === "function") {
          const serializedArgs = toolCall.function.arguments;
          const args =
            typeof serializedArgs === "string" &&
            serializedArgs.length <= 10_000
              ? JSON.parse(serializedArgs)
              : {};
          let result: any;

          if (toolCall.function.name === "webSearchTool") {
            result = await webSearchTool(args);
          } else if (toolCall.function.name === "webScrapeTool") {
            result = await webScrapeTool(args);
          }

          currentMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            name: toolCall.function.name,
            content: formatToolResult(toolCall.function.name, result),
          });
        }
      }
    } else {
      return {
        content: limitAiOutput(
          sanitizeModelResponse(message.content || "Done executing tools."),
        ),
        usage: {
          promptTokens: totalPromptTokens,
          completionTokens: totalCompletionTokens,
        },
      };
    }
  }

  return {
    content: limitAiOutput(
      sanitizeModelResponse(
        currentMessages[currentMessages.length - 1].content ||
          "Reached maximum steps.",
      ),
    ),
    usage: {
      promptTokens: totalPromptTokens,
      completionTokens: totalCompletionTokens,
    },
  };
}

export async function openaiChat(args: {
  data: { messages: any[]; temperature?: number };
}) {
  const identity = await authorizeAiRequest("openai");
  const release = acquireAiRequestSlot(identity.id);
  try {
    return await runOpenaiChat(args, identity);
  } finally {
    release();
  }
}
