import { Plus, ExternalLink } from "lucide-preact";
import { useApp } from "../context";
import { Toolbar, Eyebrow, StatusBadge, EmptyState, formatDate } from "./ui";

export function Dashboard({ navigate }: { navigate: (p: string) => void }) {
  const { stats, posts } = useApp();
  const recent = posts.slice(0, 6);

  const tiles: Array<{ label: string; value: number }> = [
    { label: "Total", value: stats?.total ?? 0 },
    { label: "Drafts", value: stats?.drafts ?? 0 },
    { label: "Scheduled", value: stats?.scheduled ?? 0 },
    { label: "Published", value: stats?.published ?? 0 },
    { label: "Failed", value: stats?.failed ?? 0 },
  ];

  return (
    <>
      <Toolbar title="Dashboard">
        <button class="btn btn-primary" onClick={() => navigate("/compose")}>
          <Plus size={15} strokeWidth={2.5} /> New article
        </button>
      </Toolbar>

      <div class="mx-auto max-w-[1200px] space-y-4 p-6">
        <div class="card">
          <div class="card-zone">
            <Eyebrow>Pipeline</Eyebrow>
            <div class="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {tiles.map((t) => (
                <div key={t.label}>
                  <div class="tnum text-[24px] font-bold leading-none">{t.value}</div>
                  <div class="mt-1 text-[11px] text-muted">{t.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-zone">
            <div class="flex items-center justify-between">
              <Eyebrow>Recent articles · {posts.length}</Eyebrow>
              <button class="btn btn-ghost btn-sm" onClick={() => navigate("/pipeline")}>View all</button>
            </div>
          </div>
          {recent.length === 0 ? (
            <div class="card-zone">
              <EmptyState
                title="No articles yet"
                hint="Generate your first SEO article from a target keyword — then schedule it to auto-publish to WordPress."
                action={
                  <button class="btn btn-primary" onClick={() => navigate("/compose")}>
                    <Plus size={15} strokeWidth={2.5} /> New article
                  </button>
                }
              />
            </div>
          ) : (
            <div>
              {recent.map((p) => (
                <button
                  key={p.id}
                  onClick={() => navigate(`/compose/${p.id}`)}
                  class="flex w-full items-center gap-3 border-t border-border px-5 py-3 text-left transition-colors hover:bg-surface-sunken"
                >
                  <div class="min-w-0 flex-1">
                    <div class="truncate text-[14px] font-medium">{p.title || p.keyword || "Untitled"}</div>
                    <div class="mt-0.5 flex items-center gap-2 text-[12px] text-muted">
                      {p.keyword && <span class="chip">{p.keyword}</span>}
                      <span class="tnum">{formatDate(p.scheduled_at || p.created_at)}</span>
                    </div>
                  </div>
                  <StatusBadge status={p.status} />
                  {p.published_url && (
                    <a href={p.published_url} target="_blank" rel="noreferrer" class="btn btn-ghost btn-sm px-1.5" onClick={(e) => e.stopPropagation()} aria-label="View live">
                      <ExternalLink size={14} />
                    </a>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
