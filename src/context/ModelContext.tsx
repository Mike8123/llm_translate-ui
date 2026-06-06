import { createContext, useContext, useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "selectedModel";

interface ModelContextValue {
  availableModels: string[];
  selectedModel: string | null;
  isLoading: boolean;
  error: string | null;
  setSelectedModel: (model: string) => void;
  setAvailableModels: (models: string[]) => void;
}

export const ModelContext = createContext<ModelContextValue>({
  availableModels: [],
  selectedModel: null,
  isLoading: false,
  error: null,
  setSelectedModel: () => {},
  setAvailableModels: () => {},
});

export function useModel() {
  return useContext(ModelContext);
}

export function ModelProvider({ children }: { children: React.ReactNode }) {
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModelState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSelectedModelState(stored);
      }
    } catch {
      // localStorage unavailable
    }
  }, []);

  const setSelectedModel = useCallback((model: string) => {
    setSelectedModelState(model);
    try {
      localStorage.setItem(STORAGE_KEY, model);
    } catch {
      // ignore
    }
  }, []);

  return (
    <ModelContext.Provider
      value={{
        availableModels,
        selectedModel,
        isLoading,
        error,
        setSelectedModel,
        setAvailableModels,
      }}
    >
      {children}
    </ModelContext.Provider>
  );
}
