import { AppContext } from "./context";
import { useAppState } from "./hooks/use-app";
import { useRouter } from "./hooks/use-router";
import { Sidebar } from "./components/sidebar";
import { ErrorBanner } from "./components/error-banner";
import { Dashboard } from "./components/dashboard";
import { Pipeline } from "./components/pipeline";
import { Calendar } from "./components/calendar";
import { Plans } from "./components/plans";
import { Composer } from "./components/composer";

export function App() {
  const appState = useAppState();
  const { view, editId, navigate } = useRouter();

  const renderMain = () => {
    switch (view) {
      case "pipeline": return <Pipeline navigate={navigate} />;
      case "calendar": return <Calendar navigate={navigate} />;
      case "plans": return <Plans navigate={navigate} />;
      case "compose": return <Composer editId={editId} navigate={navigate} />;
      default: return <Dashboard navigate={navigate} />;
    }
  };

  return (
    <AppContext.Provider value={appState}>
      <div class="flex min-h-screen">
        <Sidebar currentView={view} navigate={navigate} />
        <main class="flex-1 overflow-auto min-w-0">
          {appState.loading ? (
            <div class="flex h-full items-center justify-center">
              <p class="text-muted">Loading…</p>
            </div>
          ) : (
            renderMain()
          )}
        </main>
      </div>
      <ErrorBanner />
    </AppContext.Provider>
  );
}
