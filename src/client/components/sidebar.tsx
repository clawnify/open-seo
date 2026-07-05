import { LayoutDashboard, ListChecks, CalendarDays, Layers, Plus, Search } from "lucide-preact";
import type { View } from "../types";
import { useApp } from "../context";

const NAV: Array<{ view: View; label: string; path: string; icon: any }> = [
  { view: "dashboard", label: "Dashboard", path: "/", icon: LayoutDashboard },
  { view: "pipeline", label: "Pipeline", path: "/pipeline", icon: ListChecks },
  { view: "calendar", label: "Calendar", path: "/calendar", icon: CalendarDays },
  { view: "plans", label: "Content plans", path: "/plans", icon: Layers },
];

export function Sidebar({ currentView, navigate }: { currentView: View; navigate: (p: string) => void }) {
  const { status } = useApp();
  const wp = status?.wordpress_connected;

  return (
    <aside class="flex w-[260px] shrink-0 flex-col border-r border-border bg-surface">
      <div class="flex items-center gap-2 px-5 py-4">
        <span class="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-on-primary">
          <Search size={16} strokeWidth={2.5} />
        </span>
        <span class="text-[15px] font-bold tracking-tight">Open SEO</span>
      </div>

      <div class="px-3">
        <button class="btn btn-primary w-full" onClick={() => navigate("/compose")}>
          <Plus size={15} strokeWidth={2.5} /> New article
        </button>
      </div>

      <nav class="mt-5 px-3">
        <div class="eyebrow px-2 pb-1.5">Workspace</div>
        <div class="flex flex-col gap-0.5">
          {NAV.map(({ view, label, path, icon: Icon }) => {
            const active = view === currentView;
            return (
              <button
                key={view}
                onClick={() => navigate(path)}
                class={`flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition-colors ${
                  active ? "bg-surface-sunken font-semibold text-foreground" : "text-muted hover:bg-surface-sunken hover:text-foreground"
                }`}
              >
                <Icon size={15} /> {label}
              </button>
            );
          })}
        </div>
      </nav>

      <div class="mt-auto p-3">
        <div class="rounded-md border border-border p-3">
          <div class="eyebrow mb-1.5">WordPress</div>
          <div class="flex items-center gap-2">
            <span class={`h-2 w-2 rounded-full ${wp ? "bg-success" : "bg-faint"}`} />
            <span class="text-[12px] text-muted">{wp ? "Site connected" : "Not connected"}</span>
          </div>
          {!wp && (
            <p class="mt-1.5 text-[11px] text-faint">Connect your site in Clawnify → Integrations to publish.</p>
          )}
        </div>
      </div>
    </aside>
  );
}
