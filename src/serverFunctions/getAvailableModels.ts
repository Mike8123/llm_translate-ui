import { createServerFn } from "@tanstack/react-start";

const LM_STUDIO_URL = process.env["LM_STUDIO_URL"] ?? "http://localhost:1234";

interface OpenAIModelInfo {
  id: string;
  object: string;
  owned_by?: string;
}

interface OpenAIModelsResponse {
  data: OpenAIModelInfo[];
}

export const getAvailableModels = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const response = await fetch(`${LM_STUDIO_URL}/v1/models`, {
      signal: AbortSignal.timeout(5_000), // short timeout — models list is small
    });

    if (!response.ok) {
      return {
        models: [] as string[],
        error: `Failed to fetch models (${String(response.status)})`,
      };
    }

    const result = (await response.json()) as OpenAIModelsResponse;
    const modelIds = result.data.map((m) => m.id).filter(Boolean);

    console.log(`[getAvailableModels] LM Studio returned: ${JSON.stringify(modelIds)}`);

    return { models: modelIds, error: null };
  } catch {
    return { models: [] as string[], error: "Cannot reach LM Studio" };
  }
});
