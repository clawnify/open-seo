import { AppContext } from "./context";
import { useAppState } from "./hooks/use-app";
import { useRouter } from "./hooks/use-router";
import { Sidebar } from "./components/sidebar";
import { ErrorBanner } from "./components/error-banner";
import { Research } from "./components/research";
import { Produce } from "./components/produce";
import { Publish } from "./components/publish";
import { Measure } from "./components/measure";
import { Optimize } from "./components/optimize";
import { Composer } from "./components/composer";

export function App() {
  const appState = useAppState();
  const { view, editId, navigate } = useRouter();

  const renderStage = () => {
    switch (view) {
      case "research": return <Research navigate={navigate} />;
      case "publish": return <Publish navigate={navigate} />;
      case "measure": return <Measure navigate={navigate} />;
      case "optimize": return <Optimize navigate={navigate} />;
      case "compose": return <Composer editId={editId} navigate={navigate} />;
      default: return <Produce navigate={navigate} />;
    }
  };

  const activeStage = view === "compose" ? "produce" : view;

  return (
    <AppContext.Provider value={appState}>
      <div class="flex min-h-screen">
        <Sidebar current={activeStage} navigate={navigate} />
        <main class="min-w-0 flex-1 overflow-auto">
          {appState.loading ? (
            <div class="flex h-64 items-center justify-center"><p class="text-muted">Loading…</p></div>
          ) : (
            renderStage()
          )}
        </main>
      </div>
      <ErrorBanner />
    </AppContext.Provider>
  );
}
