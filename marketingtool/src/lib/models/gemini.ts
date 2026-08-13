"use server";

import { z } from "zod";
import {
  webSearchTool,
  webScrapeTool,
  jinaReaderTool,
  redditSearchTool,
  youtubeTranscriptTool,
} from "../tools";
import { getMarketingSystemPrompt } from "../prompt-generation";
import { formatToolResult, sanitizeModelResponse } from "../utils";

import {
  acquireAiRequestSlot,
  assertTotalMessageSize,
  authorizeAiRequest,
  geminiPayloadSchema,
  limitAiOutput,
  safeChatMessageSchema,
} from "./ai-security";
import { readResponseText } from "@/lib/network-security";
import { recordSharedUsageBestEffort } from "@/server/ai/shared-usage";

async function runGeminiChat({
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

  const apiKeys = [
    process.env.GEMINI_KEY,
    process.env.GEMINI_KEY_2,
    process.env.GEMINI_KEY_3,
    process.env.GEMINI_KEY_4,
  ].filter(Boolean) as string[];

  if (apiKeys.length === 0) {
    throw new Error("Missing GEMINI_KEY in server environment.");
  }

  const systemMessage = {
    role: "system",
    content: await getMarketingSystemPrompt(validated.messages),
  };
  const systemInstruction: string | undefined = systemMessage.content;
  const contents: Array<{
    role: "user" | "model" | "function";
    parts: Array<any>;
  }> = [];

  for (const message of validated.messages) {
    contents.push({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content }],
    });
  }

  const tools = [
    {
      functionDeclarations: [
        {
          name: "webSearchTool",
          description:
            "Search the web for information to assist with product marketing research.",
          parameters: {
            type: "OBJECT",
            properties: {
              query: { type: "STRING", description: "The search query" },
            },
            required: ["query"],
          },
        },
        {
          name: "webScrapeTool",
          description:
            "Scrape and extract raw text content from a web page/URL using a basic scraper.",
          parameters: {
            type: "OBJECT",
            properties: { url: { type: "STRING" } },
            required: ["url"],
          },
        },
        {
          name: "jinaReaderTool",
          description:
            "Extract clean, perfect Markdown from any URL using Jina.ai. Bypasses bot protection. Use this over webScrapeTool when possible.",
          parameters: {
            type: "OBJECT",
            properties: { url: { type: "STRING" } },
            required: ["url"],
          },
        },

        {
          name: "redditSearchTool",
          description:
            "Search Reddit for customer pain points, complaints, or discussions. Use for deep customer research.",
          parameters: {
            type: "OBJECT",
            properties: { query: { type: "STRING" } },
            required: ["query"],
          },
        },
        {
          name: "youtubeTranscriptTool",
          description:
            "Fetch the full text transcript of any YouTube video URL.",
          parameters: {
            type: "OBJECT",
            properties: { url: { type: "STRING" } },
            required: ["url"],
          },
        },

        {
          name: "generateMarketingFilesTool",
          description: "Generate marketing agent configuration files.",
          parameters: {
            type: "OBJECT",
            properties: {
              projectName: { type: "STRING" },
              agentContent: { type: "STRING" },
              skills: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    name: { type: "STRING" },
                    description: { type: "STRING" },
                    content: { type: "STRING" },
                  },
                  required: ["name", "description", "content"],
                },
              },
              evalsJson: { type: "STRING" },
            },
            required: ["projectName", "agentContent", "skills", "evalsJson"],
          },
        },
      ],
    },
  ];

  let lastError: Error | null = null;

  for (let k = 0; k < apiKeys.length; k++) {
    const apiKey = apiKeys[k];
    try {
      const currentContents = [...contents];
      let totalPromptTokens = 0;
      let totalCompletionTokens = 0;

      for (let step = 0; step < 4; step++) {
        const response = await fetch(
          "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": apiKey,
            },
            signal: AbortSignal.timeout(20_000),
            body: JSON.stringify({
              contents: currentContents,
              generationConfig: {
                temperature: validated.temperature ?? 0.7,
                maxOutputTokens: 4096,
              },
              tools: tools,
              ...(systemInstruction
                ? {
                    systemInstruction: { parts: [{ text: systemInstruction }] },
                  }
                : {}),
            }),
          },
        );

        const payload = geminiPayloadSchema.parse(
          JSON.parse(
            await readResponseText(response, 2 * 1024 * 1024).catch(
              () => "{}",
            ),
          ),
        );

        if (!response.ok) {
          throw new Error(`Gemini API request failed (${response.status})`);
        }

        // Gemini uses usageMetadata instead of usage
        if (payload.usageMetadata) {
          totalPromptTokens += payload.usageMetadata.promptTokenCount || 0;
          totalCompletionTokens +=
            payload.usageMetadata.candidatesTokenCount || 0;
        }
        await recordSharedUsageBestEffort({
          userId: identity.id,
          model: "gemini-2.5-flash",
          promptTokens: payload.usageMetadata?.promptTokenCount ?? 0,
          completionTokens:
            payload.usageMetadata?.candidatesTokenCount ?? 0,
        });

        const candidate = payload.candidates?.[0];
        if (!candidate || !candidate.content) {
          throw new Error("Gemini API returned an empty response.");
        }

        const modelMessage = candidate.content;
        currentContents.push(modelMessage);

        // Check for function calls
        const parts = modelMessage.parts || [];
        const functionCalls = parts.flatMap((part) =>
          part.functionCall ? [part.functionCall] : [],
        );

        if (functionCalls.length > 0) {
          if (functionCalls.length > 3) {
            throw new Error("The AI requested too many tools at once");
          }
          const functionResponseParts = [];

          for (const functionCall of functionCalls) {
            const { name, args } = functionCall;
            const serializedArgs = JSON.stringify(args ?? {});
            if (serializedArgs.length > 10_000) {
              throw new Error("Gemini tool arguments are too large");
            }
            let result: any;
            const query =
              typeof args.query === "string" ? args.query : "";
            const url = typeof args.url === "string" ? args.url : "";

            if (name === "webSearchTool") {
              result = await webSearchTool({ query });
            } else if (name === "webScrapeTool") {
              result = await webScrapeTool({ url });
            } else if (name === "jinaReaderTool") {
              result = await jinaReaderTool({ url });
            } else if (name === "redditSearchTool") {
              result = await redditSearchTool({ query });
            } else if (name === "youtubeTranscriptTool") {
              result = await youtubeTranscriptTool({ url });
            }

            functionResponseParts.push({
              functionResponse: {
                name: name,
                response: { output: formatToolResult(name, result) },
              },
            });
          }

          currentContents.push({
            role: "user",
            parts: functionResponseParts,
          });
        } else {
          // No function calls, get the text and finish
          const contentText = parts
            .map((part: any) => part.text)
            .filter(
              (text: any): text is string =>
                typeof text === "string" && text.length > 0,
            )
            .join("");

          return {
            content: limitAiOutput(
              sanitizeModelResponse(contentText || "Done executing tools."),
            ),
            usage: {
              promptTokens: totalPromptTokens,
              completionTokens: totalCompletionTokens,
            },
          };
        }
      }

      let finalContent =
        (currentContents[currentContents.length - 1] as any) ||
        "Reached maximum steps.";
      if (
        finalContent.parts &&
        finalContent.parts.some((p: any) => p.functionResponse)
      ) {
        finalContent =
          "I've gathered a lot of information but reached my search limit. Please ask me to synthesize the findings!";
      } else if (typeof finalContent === "string") {
        // it's a string
      } else if (finalContent.parts) {
        finalContent = finalContent.parts.map((p: any) => p.text).join("");
      }

      return {
        content: limitAiOutput(sanitizeModelResponse(finalContent)),
        usage: {
          promptTokens: totalPromptTokens,
          completionTokens: totalCompletionTokens,
        },
      };
    } catch (err) {
      console.warn(`Gemini key at index ${k} failed; trying the next key`);
      lastError = err as Error;
    }
  }

  throw lastError || new Error("All Gemini API keys failed.");
}

export async function geminiChat(args: {
  data: { messages: any[]; temperature?: number };
}) {
  const identity = await authorizeAiRequest("gemini", { proModel: true });
  const release = acquireAiRequestSlot(identity.id);
  try {
    return await runGeminiChat(args, identity);
  } finally {
    release();
  }
}
