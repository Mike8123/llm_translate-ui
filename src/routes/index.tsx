import { createFileRoute } from "@tanstack/react-router";
import { TranslationPanel } from "~/components/TranslationPanel";
import { LabelProvider } from "~/context/LabelContext";
import { ModelProvider } from "~/context/ModelContext";

export const Route = createFileRoute("/")({
  component: HomePage,
  head: () => ({
    meta: [{ title: "TranslateGemma UI" }],
  }),
});

function HomePage() {
  return (
    <div className="min-h-screen px-5 py-10 dark:bg-zinc-950">
      <ModelProvider>
        <LabelProvider>
          <TranslationPanel />
        </LabelProvider>
      </ModelProvider>
    </div>
  );
}
