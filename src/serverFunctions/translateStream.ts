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

export const translateStream = createServerFn({ method: "POST" })
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

    const response = await fetch(`${LM_STUDIO_URL}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: data.model ?? DEFAULT_MODEL,
        messages: [{ role: "user", content: prompt }],
        stream: true,
        temperature: 0.1,
        max_tokens: 4096,
      }),
      signal: AbortSignal.timeout(300_000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LM Studio API error: ${String(response.status)} - ${errorText}`);
    }

    return new Response(response.body, {
      headers: { "Content-Type": "text/event-stream" },
    });
  });
