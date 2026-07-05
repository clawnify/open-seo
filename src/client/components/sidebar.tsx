import { Search, Sparkles } from "lucide-preact";
import { useApp } from "../context";
import type { View } from "../types";

const STAGES: Array<{ view: View; label: string; path: string }> = [
  { view: "research", label: "Research", path: "/research" },
  { view: "produce", label: "Produce", path: "/produce" },
  { view: "publish", label: "Publish", path: "/publish" },
  { view: "measure", label: "Measure", path: "/measure" },
  { view: "optimize", label: "Optimize", path: "/optimize" },
];

export function Sidebar({ current, navigate }: { current: View; navigate: (p: string) => void }) {
  const { status } = useApp();
  const wp = status?.wordpress_connected;
  const ai = status?.ai;

  return (
    <aside class="sticky top-0 flex h-screen w-[260px] shrink-0 flex-col border-r border-border bg-surface">
      <button class="flex items-center gap-2 px-5 py-4" onClick={() => navigate("/produce")}>
        <span class="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-on-primary">
          <Search size={16} strokeWidth={2.5} />
        </span>
        <span class="text-[15px] font-bold tracking-tight">Open SEO</span>
      </button>

      <nav class="mt-2 px-3">
        <div class="eyebrow px-2 pb-1.5">Pipeline</div>
        <div class="flex flex-col gap-0.5">
          {STAGES.map((s, i) => (
            <button
              key={s.view}
              class={`side-item ${current === s.view ? "side-item-active" : ""}`}
              onClick={() => navigate(s.path)}
            >
              <span class="stage-step">{i + 1}</span> {s.label}
            </button>
          ))}
        </div>
      </nav>

      <div class="mt-auto space-y-2 p-3">
        <div class="rounded-md border border-border p-3">
          <div class="eyebrow mb-2">Connections</div>
          <div class="flex items-center gap-2 text-[12px] text-muted">
            <Sparkles size={13} class={ai ? "text-foreground" : "text-faint"} />
            AI generation {ai ? "ready" : "off"}
          </div>
          <div class="mt-1.5 flex items-center gap-2 text-[12px] text-muted">
            <span class={`h-2 w-2 rounded-full ${wp ? "bg-success" : "bg-faint"}`} />
            WordPress {wp ? "connected" : "not connected"}
          </div>
          {!wp && <p class="mt-1.5 text-[11px] text-faint">Connect your site in Clawnify → Integrations to publish.</p>}
        </div>
      </div>
    </aside>
  );
}
