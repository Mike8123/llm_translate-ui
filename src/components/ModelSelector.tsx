import { useState, useCallback, useRef, useEffect } from "react";
import { useModel } from "~/context/ModelContext";
import { getAvailableModels } from "~/serverFunctions/getAvailableModels";
export function ModelSelector() {
  const { availableModels, selectedModel, setSelectedModel, setAvailableModels } = useModel();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch available models when dropdown opens
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    getAvailableModels()
      .then((result) => {
        if (cancelled) return;
        setAvailableModels(result.models);
        setFetchError(result.error);
        if (result.models.length > 0 && !selectedModel) {
          const first = result.models[0];
          if (first) setSelectedModel(first);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setFetchError("Failed to fetch models");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, selectedModel, setAvailableModels, setSelectedModel]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
    };
  }, [isOpen]);

  const handleSelect = useCallback(
    (model: string) => {
      setSelectedModel(model);
      setIsOpen(false);
    },
    [setSelectedModel]
  );

  const selectedName = selectedModel ?? "No model loaded";

  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen((v) => !v);
        }}
        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
          isOpen
            ? "bg-zinc-200 dark:bg-zinc-700"
            : "bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
        } text-zinc-600 dark:text-zinc-300`}
      >
        {/* Icon */}
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
        <span className="max-w-40 truncate">{selectedName}</span>
        {/* Chevron */}
        <svg
          className={`h-3 w-3 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => {
              setIsOpen(false);
            }}
          />
          <div className="absolute top-full right-0 z-50 mt-2 w-64 origin-top-right rounded-xl bg-white shadow-xl dark:bg-zinc-800">
            {/* Header */}
            <div className="border-b border-zinc-100 px-3 py-2 dark:border-zinc-700">
              <p className="text-[11px] font-medium tracking-wider text-zinc-400 uppercase dark:text-zinc-500">
                Model
              </p>
            </div>

            {/* Loading state */}
            {isLoading && (
              <div className="flex items-center justify-center gap-2 py-6">
                <svg className="h-4 w-4 animate-spin text-zinc-400" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                <span className="text-xs text-zinc-400">Loading models…</span>
              </div>
            )}

            {/* Error state */}
            {fetchError && !isLoading && (
              <div className="px-3 py-2">
                <p className="text-xs text-red-500">{fetchError}</p>
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                  }}
                  className="mt-1 text-[11px] text-zinc-400 underline hover:text-zinc-600 dark:hover:text-zinc-300"
                >
                  Close
                </button>
              </div>
            )}

            {/* Model list */}
            {!isLoading && availableModels.length > 0 && (
              <ul className="max-h-64 overflow-auto py-1">
                {availableModels.map((model) => (
                  <li key={model}>
                    <button
                      type="button"
                      onClick={() => {
                        handleSelect(model);
                      }}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-left transition-colors ${
                        model === selectedModel
                          ? "bg-zinc-100 dark:bg-zinc-700"
                          : "hover:bg-zinc-50 dark:hover:bg-zinc-700/50"
                      }`}
                    >
                      {/* Checkmark */}
                      {model === selectedModel && (
                        <svg
                          className="h-3.5 w-3.5 shrink-0 text-zinc-600 dark:text-zinc-300"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                      {model !== selectedModel && <span className="w-3.5 shrink-0" />}
                      {/* Name */}
                      <span
                        className={`truncate text-xs ${model === selectedModel ? "font-medium text-zinc-800 dark:text-zinc-100" : "text-zinc-600 dark:text-zinc-300"}`}
                      >
                        {model}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {/* Empty state */}
            {!isLoading && availableModels.length === 0 && !fetchError && (
              <div className="px-3 py-6 text-center">
                <p className="text-xs text-zinc-400">No models found</p>
                <p className="mt-1 text-[11px] text-zinc-300 dark:text-zinc-500">
                  Load a model in LM Studio first
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
