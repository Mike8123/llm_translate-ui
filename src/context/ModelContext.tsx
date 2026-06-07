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
  setSelectedModel: () => {
    // no-op
  },
  setAvailableModels: () => {
    // no-op
  },
});

export function useModel() {
  return useContext(ModelContext);
}

export function ModelProvider({ children }: { children: React.ReactNode }) {
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModelState] = useState<string | null>(null);
  const [_isLoading, _setIsLoading] = useState(false);
  const [error, _setError] = useState<string | null>(null);

  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration from external system (localStorage) is the correct pattern
        setSelectedModelState(stored);
      }
    } catch {
      // localStorage unavailable
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration flag must be set after external system read
    setHydrated(true);
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
        selectedModel: hydrated ? selectedModel : null,
        isLoading: _isLoading,
        error,
        setSelectedModel,
        setAvailableModels,
      }}
    >
      {children}
    </ModelContext.Provider>
  );
}
