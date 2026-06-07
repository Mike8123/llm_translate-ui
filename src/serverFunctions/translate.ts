import { createServerFn } from "@tanstack/react-start";
import { buildTranslationPrompt } from "~/lib/prompt";

const LM_STUDIO_URL = process.env["LM_STUDIO_URL"] ?? "http://localhost:1234";
const DEFAULT_MODEL = process.env["DEFAULT_MODEL"] ?? "google/translategemma-27b-it";

interface TranslateInput {
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
  model?: string;
}

interface OpenAIChatRequest {
  model: string;
  messages: { role: "system" | "user"; content: string | unknown[] }[];
  temperature?: number;
  max_tokens?: number;
}

interface OpenAIChoice {
  index: number;
  message: { role: string; content: string };
  finish_reason: string | null;
}

interface OpenAIChatResponse {
  model: string;
  choices: OpenAIChoice[];
}

export const translate = createServerFn({ method: "POST" })
  .inputValidator((data: unknown): TranslateInput => {
    if (typeof data !== "object" || data === null) {
      throw new Error("Invalid input");
    }

    const input = data as Record<string, unknown>;

    if (typeof input["text"] !== "string" || input["text"].trim() === "") {
      throw new Error("Text is required");
    }

    if (typeof input["sourceLanguage"] !== "string" || input["sourceLanguage"].trim() === "") {
      throw new Error("Source language is required");
    }

    if (typeof input["targetLanguage"] !== "string" || input["targetLanguage"].trim() === "") {
      throw new Error("Target language is required");
    }

    const result: TranslateInput = {
      text: input["text"],
      sourceLanguage: input["sourceLanguage"].trim(),
      targetLanguage: input["targetLanguage"].trim(),
    };

    if (typeof input["model"] === "string") {
      result.model = input["model"];
    }

    return result;
  })
  .handler(async ({ data }) => {
    const prompt = buildTranslationPrompt(data.text, data.sourceLanguage, data.targetLanguage);

    const modelName = data.model ?? DEFAULT_MODEL;
    const isTranslateGemma = modelName.toLowerCase().includes("translategemma");

    const requestBody: OpenAIChatRequest = {
      model: modelName,
      messages: isTranslateGemma
        ? [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  source_lang_code: data.sourceLanguage,
                  target_lang_code: data.targetLanguage,
                  text: prompt,
                },
              ],
            },
          ]
        : [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens: 4096,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 300000); // 5 minute timeout

    let response: Response;
    try {
      response = await fetch(`${LM_STUDIO_URL}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LM Studio API error: ${String(response.status)} - ${errorText}`);
    }

    const result = (await response.json()) as OpenAIChatResponse;
    const content = result.choices[0]?.message.content ?? "";

    return {
      translation: content.trim(),
      model: result.model,
      stats: null,
    };
  });
