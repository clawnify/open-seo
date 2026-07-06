import { useState } from "preact/hooks";
import { Plus, Trash2, ArrowRight, Search, Radar, FileText, Loader2, ExternalLink } from "lucide-preact";
import { useApp } from "../context";
import { Eyebrow, EmptyState, Page } from "./ui";
import type { KeywordDiscovery, CompetitorResult, Difficulty, ResearchSource } from "../types";

const DIFF_BADGE: Record<Difficulty, string> = {
  Low: "badge-success",
  Medium: "badge-warning",
  High: "badge-danger",
};

function SourceBadge({ source }: { source: ResearchSource }) {
  return source === "live"
    ? <span class="badge badge-success">Live SERP</span>
    : <span class="badge badge-neutral">AI-estimated</span>;
}

export function Research({ navigate }: { navigate: (p: string) => void }) {
  const { plans, createPlan, deletePlan, status, discoverKeywords, researchCompetitors, generateArticle } = useApp();
  const live = !!status?.research_live;

  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", keyword: "", audience: "" });

  // Keyword discovery
  const [seed, setSeed] = useState("");
  const [audience, setAudience] = useState("");
  const [discBusy, setDiscBusy] = useState(false);
  const [discovery, setDiscovery] = useState<KeywordDiscovery | null>(null);

  // Competitor SERP
  const [coSeed, setCoSeed] = useState("");
  const [coBusy, setCoBusy] = useState(false);
  const [competitors, setCompetitors] = useState<CompetitorResult | null>(null);

  // Shared: turn any discovered keyword into a draft (flows into Produce).
  const [draftingKw, setDraftingKw] = useState<string | null>(null);

  const submitPlan = async () => {
    if (!form.name.trim()) return;
    const created = await createPlan(form);
    if (created) { setForm({ name: "", keyword: "", audience: "" }); setCreating(false); }
  };

  const discover = async () => {
    if (!seed.trim()) return;
    setDiscBusy(true);
    setDiscovery(await discoverKeywords(seed.trim(), audience.trim() || undefined));
    setDiscBusy(false);
  };

  const analyze = async () => {
    if (!coSeed.trim()) return;
    setCoBusy(true);
    setCompetitors(await researchCompetitors(coSeed.trim()));
    setCoBusy(false);
  };

  const draft = async (keyword: string) => {
    setDraftingKw(keyword);
    const post = await generateArticle({ keyword });
    setDraftingKw(null);
    if (post) navigate(`/compose/${post.id}`);
  };

  return (
    <Page title="Research" actions={
      <button class="btn btn-secondary" onClick={() => setCreating((v) => !v)}>
        <Plus size={15} strokeWidth={2.5} /> New plan
      </button>
    }>
      {/* Keyword discovery */}
      <div class="card">
        <div class="card-zone">
          <div class="flex items-center justify-between gap-3">
            <Eyebrow>Keyword discovery</Eyebrow>
            {live
              ? <span class="badge badge-success">Live · SerpAPI</span>
              : <span class="badge badge-neutral" title="Connect SerpAPI in Clawnify → Integrations for live Google data">AI-estimated</span>}
          </div>
          <div class="mt-3 flex flex-wrap items-end gap-3">
            <label class="field min-w-[240px] flex-1"><span>Seed topic or keyword</span>
              <input class="input" value={seed} placeholder="wordpress seo"
                onInput={(e) => setSeed((e.target as HTMLInputElement).value)}
                onKeyDown={(e) => e.key === "Enter" && discover()} />
            </label>
            <label class="field w-52"><span>Audience (optional)</span>
              <input class="input" value={audience} placeholder="small business owners"
                onInput={(e) => setAudience((e.target as HTMLInputElement).value)}
                onKeyDown={(e) => e.key === "Enter" && discover()} />
            </label>
            <button class="btn btn-primary" onClick={discover} disabled={discBusy || !seed.trim()}>
              {discBusy ? <Loader2 size={15} class="animate-spin" /> : <Search size={15} strokeWidth={2.5} />} Discover
            </button>
          </div>
          <p class="mt-2 text-[12px] text-muted">
            {live
              ? "Pulls real related searches, People-Also-Ask questions, and page-1 competitors from live Google results."
              : "Connect SerpAPI in Clawnify → Integrations to pull live Google data. Until then, ideas are AI-estimated."}
          </p>
        </div>

        {discovery && (
          <div class="card-zone pt-0">
            <div class="mb-2 flex items-center gap-2">
              <Eyebrow>Opportunities · {discovery.ideas.length}</Eyebrow>
              <SourceBadge source={discovery.source} />
            </div>
            {discovery.ideas.length === 0 ? (
              <p class="py-6 text-center text-[13px] text-muted">No ideas returned — try a broader seed.</p>
            ) : (
              <div class="overflow-x-auto rounded-md border border-border">
                <table class="tbl">
                  <thead><tr><th>Keyword</th><th>Intent</th><th>Difficulty</th><th>Opportunity</th><th class="w-24"></th></tr></thead>
                  <tbody>
                    {discovery.ideas.map((k) => (
                      <tr key={k.keyword}>
                        <td class="font-medium">{k.keyword}</td>
                        <td><span class="chip">{k.intent}</span></td>
                        <td><span class={`badge ${DIFF_BADGE[k.difficulty]}`}>{k.difficulty}</span></td>
                        <td class="text-muted">{k.angle || "—"}</td>
                        <td class="text-right">
                          <button class="btn btn-secondary btn-sm" onClick={() => draft(k.keyword)} disabled={draftingKw !== null}>
                            {draftingKw === k.keyword ? <Loader2 size={13} class="animate-spin" /> : <FileText size={13} />} Draft
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Competitor SERP (live-only) */}
      <div class="card">
        <div class="card-zone">
          <Eyebrow>Competitor SERP</Eyebrow>
          <div class="mt-3 flex flex-wrap items-end gap-3">
            <label class="field min-w-[240px] flex-1"><span>Keyword to analyze</span>
              <input class="input" value={coSeed} placeholder="best wordpress seo plugin"
                onInput={(e) => setCoSeed((e.target as HTMLInputElement).value)}
                onKeyDown={(e) => e.key === "Enter" && analyze()} />
            </label>
            <button class="btn btn-secondary" onClick={analyze} disabled={coBusy || !coSeed.trim() || !live}
              title={live ? "" : "Connect SerpAPI to analyze live results"}>
              {coBusy ? <Loader2 size={14} class="animate-spin" /> : <Radar size={14} />} Analyze
            </button>
          </div>
          {!live && (
            <p class="mt-2 text-[12px] text-warning">
              Connect SerpAPI in Clawnify → Integrations — competitor analysis reads live Google rankings, which can't be estimated.
            </p>
          )}
        </div>

        {competitors && (competitors.live === false ? (
          <div class="card-zone pt-0">
            <p class="py-6 text-center text-[13px] text-muted">No live results — connect SerpAPI to see who currently ranks.</p>
          </div>
        ) : (
          <>
            <div class="card-zone pt-0">
              <Eyebrow>Ranking now · “{competitors.seed}”</Eyebrow>
              <div class="mt-2 overflow-x-auto rounded-md border border-border">
                <table class="tbl">
                  <thead><tr><th class="num w-12">#</th><th>Domain</th><th>Title</th><th class="w-10"></th></tr></thead>
                  <tbody>
                    {competitors.competitors.map((c) => (
                      <tr key={c.position + c.url}>
                        <td class="num text-muted">{c.position}</td>
                        <td class="font-medium">{c.domain}</td>
                        <td class="text-muted">{c.title || "—"}</td>
                        <td class="text-right">
                          {c.url && <a class="btn btn-ghost btn-sm px-1.5" href={c.url} target="_blank" rel="noreferrer" aria-label="Open result"><ExternalLink size={14} /></a>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            {competitors.gaps.length > 0 && (
              <div class="card-zone pt-3">
                <Eyebrow>Content gaps · what searchers also ask</Eyebrow>
                <div class="mt-2 overflow-x-auto rounded-md border border-border">
                  <table class="tbl">
                    <thead><tr><th>Gap keyword / question</th><th class="w-24"></th></tr></thead>
                    <tbody>
                      {competitors.gaps.map((g) => (
                        <tr key={g}>
                          <td>{g}</td>
                          <td class="text-right">
                            <button class="btn btn-secondary btn-sm" onClick={() => draft(g)} disabled={draftingKw !== null}>
                              {draftingKw === g ? <Loader2 size={13} class="animate-spin" /> : <FileText size={13} />} Draft
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        ))}
      </div>

      {/* Content plans (live CRUD) */}
      <div class="card">
        <div class="card-zone pb-0"><Eyebrow>Content plans · {plans.length}</Eyebrow></div>

        {creating && (
          <div class="card-zone">
            <div class="grid gap-3 sm:grid-cols-3">
              <label class="field"><span>Cluster / pillar topic</span>
                <input class="input" value={form.name} placeholder="WordPress SEO basics"
                  onInput={(e) => setForm({ ...form, name: (e.target as HTMLInputElement).value })} />
              </label>
              <label class="field"><span>Primary keyword</span>
                <input class="input" value={form.keyword} placeholder="wordpress seo"
                  onInput={(e) => setForm({ ...form, keyword: (e.target as HTMLInputElement).value })} />
              </label>
              <label class="field"><span>Target audience</span>
                <input class="input" value={form.audience} placeholder="small business owners"
                  onInput={(e) => setForm({ ...form, audience: (e.target as HTMLInputElement).value })} />
              </label>
            </div>
            <div class="mt-3 flex justify-end gap-2">
              <button class="btn btn-secondary" onClick={() => setCreating(false)}>Cancel</button>
              <button class="btn btn-primary" onClick={submitPlan} disabled={!form.name.trim()}>Create plan</button>
            </div>
          </div>
        )}

        {plans.length === 0 && !creating ? (
          <div class="card-zone pt-3">
            <EmptyState
              title="No content plans yet"
              hint="A plan groups articles around a pillar topic so you build topical authority. Discover keywords above, or create one, then produce articles against it."
              action={<button class="btn btn-secondary" onClick={() => setCreating(true)}><Plus size={15} strokeWidth={2.5} /> New plan</button>}
            />
          </div>
        ) : (
          <div class="card-zone pt-3">
            <div class="overflow-x-auto rounded-md border border-border">
              <table class="tbl">
                <thead><tr><th>Cluster</th><th>Primary keyword</th><th>Audience</th><th class="w-28"></th></tr></thead>
                <tbody>
                  {plans.map((p) => (
                    <tr key={p.id}>
                      <td class="font-medium">{p.name}</td>
                      <td>{p.keyword ? <span class="chip">{p.keyword}</span> : <span class="text-faint">—</span>}</td>
                      <td class="text-muted">{p.audience || "—"}</td>
                      <td class="text-right">
                        <button class="btn btn-secondary btn-sm" onClick={() => navigate("/produce")}>Produce <ArrowRight size={13} /></button>
                        <button class="btn btn-danger btn-sm px-1.5" onClick={() => deletePlan(p.id)} aria-label="Delete plan"><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Page>
  );
}
