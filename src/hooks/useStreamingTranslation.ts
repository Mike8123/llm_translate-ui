import { useState, useRef, useCallback, useEffect } from "react";
import { translateStream } from "~/serverFunctions/translateStream";

interface OpenAIStreamDelta {
  content?: string;
}

interface OpenAIStreamChoice {
  index: number;
  delta: OpenAIStreamDelta;
  finish_reason: string | null;
}

interface OpenAIStreamEvent {
  choices: OpenAIStreamChoice[];
}

interface Stats {
  duration?: number;
  tokens?: number;
}

export function useStreamingTranslation(selectedModel?: string) {
  const [translatedText, setTranslatedText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);

  const controllerRef = useRef<AbortController | null>(null);
  const rafRef = useRef<number>(0);
  const modelRef = useRef(selectedModel);

  // Always keep the latest model in a ref so startTranslation reads it
  useEffect(() => {
    modelRef.current = selectedModel;
  }, [selectedModel]);

  const abort = useCallback(() => {
    if (controllerRef.current) {
      controllerRef.current.abort();
      controllerRef.current = null;
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    setIsStreaming(false);
  }, []);

  const startTranslation = useCallback(
    (text: string, sourceLanguage: string, targetLanguage: string) => {
      // Abort any in-flight stream
      abort();

      setTranslatedText("");
      setError(null);
      setStats(null);
      setIsStreaming(true);

      const controller = new AbortController();
      controllerRef.current = controller;

      void (async () => {
        try {
          const response = await translateStream({
            data: { text, sourceLanguage, targetLanguage, model: modelRef.current ?? undefined },
            signal: controller.signal,
          });

          if (!response.body) {
            throw new Error("No response body");
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          let accumulated = "";
          let pendingUpdate = false;

          const flushUpdate = () => {
            setTranslatedText(accumulated);
            pendingUpdate = false;
            rafRef.current = 0;
          };

          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            // Process SSE lines — each line is "data: {...}" or "[DONE]"
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || trimmed === "[DONE]") continue;

              // Strip SSE data: prefix
              let jsonStr = trimmed;
              if (jsonStr.startsWith("data:")) {
                jsonStr = jsonStr.slice(5).trim();
              }
              if (!jsonStr) continue;

              let parsed: OpenAIStreamEvent;
              try {
                parsed = JSON.parse(jsonStr) as OpenAIStreamEvent;
              } catch {
                continue;
              }

              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                accumulated += content;
              }
            }

            // Batch UI updates with rAF
            if (!pendingUpdate) {
              pendingUpdate = true;
              rafRef.current = requestAnimationFrame(flushUpdate);
            }
          }

          // Final flush
          if (pendingUpdate && rafRef.current) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = 0;
          }
          setTranslatedText(accumulated);
          setIsStreaming(false);
        } catch (err) {
          if (err instanceof DOMException && err.name === "AbortError") {
            return; // Expected cancellation
          }
          setError(err instanceof Error ? err.message : "Translation failed");
          setIsStreaming(false);
        }
      })();
    },
    [abort]
  );

  useEffect(() => abort, [abort]);

  return {
    translatedText,
    setTranslatedText,
    isStreaming,
    error,
    setError,
    stats,
    setStats,
    startTranslation,
    abort,
  };
}
