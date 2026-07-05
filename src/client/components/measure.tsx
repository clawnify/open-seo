import { useApp } from "../context";
import { Eyebrow, StatTile, Phase2Empty, formatDate } from "./ui";

export function Measure(_: { navigate: (p: string) => void }) {
  const { stats, posts } = useApp();
  const daily = stats?.daily ?? [];
  const max = Math.max(1, ...daily.map((d) => d.count));
  const publishedRate = stats && stats.total > 0 ? Math.round((stats.published / stats.total) * 100) : 0;

  return (
    <div class="mx-auto max-w-[1100px] space-y-4 p-6">
      <div>
        <h1 class="text-[20px] font-bold tracking-tight">Measure</h1>
        <p class="mt-0.5 text-[13px] text-muted">Track what you've produced and how it's performing.</p>
      </div>

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

      {/* Search performance (Phase 2) */}
      <div class="card">
        <div class="card-zone pb-0"><Eyebrow>Search performance</Eyebrow></div>
        <div class="card-zone pt-2">
          <Phase2Empty
            title="Rankings, clicks & AI citations"
            hint="Track positions, impressions, CTR, and how often your brand is cited in AI answers — from Search Console and live rank data. Wiring up next."
          />
        </div>
      </div>
    </div>
  );
}
