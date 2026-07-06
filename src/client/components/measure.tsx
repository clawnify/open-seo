import { useState } from "preact/hooks";
import { Loader2, RefreshCw } from "lucide-preact";
import { useApp } from "../context";
import { Eyebrow, StatTile, formatDate, formatDateTime, Page } from "./ui";
import type { Post } from "../types";

function RankCell({ post }: { post: Post }) {
  if (!post.rank_checked_at) return <span class="text-faint">—</span>;
  if (post.rank == null) return <span class="badge badge-neutral">Not top 10</span>;
  const cls = post.rank <= 3 ? "badge-success" : "badge-warning";
  return <span class={`badge ${cls}`}>#{post.rank}</span>;
}

export function Measure(_: { navigate: (p: string) => void }) {
  const { stats, posts, status, refreshRankings } = useApp();
  const daily = stats?.daily ?? [];
  const max = Math.max(1, ...daily.map((d) => d.count));
  const publishedRate = stats && stats.total > 0 ? Math.round((stats.published / stats.total) * 100) : 0;
  const live = !!status?.research_live;

  // Rank tracking (Measure Phase 2) — derived from posts, refreshed on demand.
  const tracked = posts.filter((p) => p.status === "published" && p.keyword);
  const onPage1 = tracked.filter((p) => p.rank != null);
  const top3 = tracked.filter((p) => p.rank != null && p.rank <= 3);
  const best = onPage1.reduce<number | null>((m, p) => (m == null || (p.rank as number) < m ? (p.rank as number) : m), null);
  const lastChecked = tracked
    .map((p) => p.rank_checked_at)
    .filter(Boolean)
    .sort()
    .pop() as string | undefined;

  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const check = async () => {
    setBusy(true);
    const r = await refreshRankings();
    setBusy(false);
    if (r && r.live) setNote(`Checked ${r.checked} article${r.checked === 1 ? "" : "s"}${r.unchecked ? ` · ${r.unchecked} still unchecked — run again` : ""}.`);
    else if (r) setNote(null);
  };

  return (
    <Page title="Measure">
      {/* Pipeline KPIs (live) */}
      <div class="card">
        <div class="card-zone">
          <Eyebrow>Content pipeline</Eyebrow>
          <div class="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <StatTile value={stats?.total ?? 0} label="Articles" meta={`${stats?.plans ?? 0} plans`} />
            <StatTile value={stats?.drafts ?? 0} label="Drafts" />
            <StatTile value={stats?.scheduled ?? 0} label="Scheduled" />
            <StatTile value={stats?.published ?? 0} label="Published" meta={`${publishedRate}% of total`} />
            <StatTile value={stats?.failed ?? 0} label="Failed" />
            <StatTile value={stats?.plans ?? 0} label="Content plans" />
          </div>
        </div>
      </div>

      {/* Keyword rankings (live SerpAPI) */}
      <div class="card">
        <div class="card-zone">
          <div class="flex items-center justify-between gap-3">
            <Eyebrow>Keyword rankings</Eyebrow>
            <div class="flex items-center gap-2">
              {lastChecked && <span class="text-[11px] text-faint">Checked {formatDateTime(lastChecked)}</span>}
              <button class="btn btn-secondary btn-sm" onClick={check} disabled={busy || !live || tracked.length === 0}
                title={live ? "" : "Connect SerpAPI to track live rankings"}>
                {busy ? <Loader2 size={13} class="animate-spin" /> : <RefreshCw size={13} />} Check rankings
              </button>
            </div>
          </div>

          {!live ? (
            <p class="mt-3 text-[13px] text-muted">
              Connect SerpAPI in Clawnify → Integrations to track where your published articles rank on Google — positions are read from live search results, which can't be estimated.
            </p>
          ) : tracked.length === 0 ? (
            <p class="mt-3 py-8 text-center text-[13px] text-muted">Publish articles to start tracking their live Google positions here.</p>
          ) : (
            <>
              <div class="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <StatTile value={tracked.length} label="Tracked keywords" />
                <StatTile value={onPage1.length} label="On page 1" meta={`of ${tracked.length}`} />
                <StatTile value={top3.length} label="In top 3" />
                <StatTile value={best != null ? `#${best}` : "—"} label="Best position" />
              </div>
              {note && <p class="mt-3 text-[12px] text-muted">{note}</p>}
              <div class="mt-3 overflow-x-auto rounded-md border border-border">
                <table class="tbl">
                  <thead><tr><th>Article</th><th>Keyword</th><th class="num">Position</th><th class="num">Checked</th></tr></thead>
                  <tbody>
                    {tracked.map((p) => (
                      <tr key={p.id}>
                        <td class="font-medium">{p.published_url ? <a class="text-link underline" href={p.published_url} target="_blank" rel="noreferrer">{p.title || "Untitled"}</a> : p.title || "Untitled"}</td>
                        <td>{p.keyword ? <span class="chip">{p.keyword}</span> : <span class="text-faint">—</span>}</td>
                        <td class="num"><RankCell post={p} /></td>
                        <td class="num text-muted">{p.rank_checked_at ? formatDate(p.rank_checked_at) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Publishing activity (live) */}
      <div class="card">
        <div class="card-zone">
          <Eyebrow>Publishing activity · last 30 days</Eyebrow>
          {daily.length === 0 ? (
            <p class="mt-3 py-8 text-center text-[13px] text-muted">No scheduled activity yet — schedule articles in Publish to see the cadence here.</p>
          ) : (
            <div class="mt-4 flex h-32 items-end gap-1.5">
              {daily.map((d) => (
                <div key={d.day} class="group flex flex-1 flex-col items-center justify-end gap-1" title={`${formatDate(d.day)}: ${d.count}`}>
                  <span class="tnum text-[10px] text-muted opacity-0 group-hover:opacity-100">{d.count}</span>
                  <div class="w-full rounded-sm bg-primary/80" style={{ height: `${Math.round((d.count / max) * 100)}%` }} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent published (live) */}
      {posts.some((p) => p.status === "published") && (
        <div class="card">
          <div class="card-zone pb-0"><Eyebrow>Recently published</Eyebrow></div>
          <div class="card-zone pt-3">
            <div class="overflow-x-auto rounded-md border border-border">
              <table class="tbl">
                <thead><tr><th>Title</th><th>Keyword</th><th class="num">Published</th></tr></thead>
                <tbody>
                  {posts.filter((p) => p.status === "published").slice(0, 8).map((p) => (
                    <tr key={p.id}>
                      <td class="font-medium">{p.published_url ? <a class="text-link underline" href={p.published_url} target="_blank" rel="noreferrer">{p.title}</a> : p.title}</td>
                      <td>{p.keyword ? <span class="chip">{p.keyword}</span> : <span class="text-faint">—</span>}</td>
                      <td class="num text-muted">{formatDate(p.published_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}
