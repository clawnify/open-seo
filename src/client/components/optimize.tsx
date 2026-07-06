import { useState, useEffect } from "preact/hooks";
import { Sparkles, Check, X, Loader2, ArrowRight } from "lucide-preact";
import { useApp } from "../context";
import { Eyebrow, EmptyState, Page } from "./ui";
import type { OptimizeSuggestion, ResearchSource } from "../types";

function SourceBadge({ source }: { source: ResearchSource }) {
  return source === "live"
    ? <span class="badge badge-success">Live SERP</span>
    : <span class="badge badge-neutral">AI-estimated</span>;
}

export function Optimize({ navigate }: { navigate: (p: string) => void }) {
  const { posts, status, suggestOptimizations, updatePost } = useApp();
  const editable = posts.filter((p) => p.content_html && p.content_html.trim());
  const ai = !!status?.ai;

  const [selectedId, setSelectedId] = useState<number | null>(null);
  useEffect(() => {
    if (selectedId == null && editable.length) {
      // Default to a published article if there is one, else the first editable.
      setSelectedId((editable.find((p) => p.status === "published") ?? editable[0]).id);
    }
  }, [editable, selectedId]);
  const post = editable.find((p) => p.id === selectedId) ?? null;

  const [busy, setBusy] = useState(false);
  const [source, setSource] = useState<ResearchSource | null>(null);
  const [suggestions, setSuggestions] = useState<OptimizeSuggestion[]>([]);
  const [applied, setApplied] = useState(0);
  const [applying, setApplying] = useState<number | null>(null);

  const analyze = async () => {
    if (!post) return;
    setBusy(true);
    setSuggestions([]);
    setApplied(0);
    const r = await suggestOptimizations(post.id);
    setBusy(false);
    if (r) { setSuggestions(r.suggestions); setSource(r.source); }
  };

  const apply = async (s: OptimizeSuggestion, idx: number) => {
    if (!post) return;
    setApplying(idx);
    const patch = s.type === "meta"
      ? { meta_description: s.value }
      : { content_html: `${post.content_html}\n${s.value}` };
    const ok = await updatePost(post.id, patch);
    setApplying(null);
    if (ok) { setSuggestions((list) => list.filter((_, i) => i !== idx)); setApplied((n) => n + 1); }
  };

  const dismiss = (idx: number) => setSuggestions((list) => list.filter((_, i) => i !== idx));

  return (
    <Page title="Optimize">
      <div class="card">
        <div class="card-zone">
          <Eyebrow>Improve an article</Eyebrow>
          {editable.length === 0 ? (
            <EmptyState title="No articles to optimize yet" hint="Generate and save an article in Produce — then get concrete, SERP-grounded improvements here." />
          ) : (
            <>
              <div class="mt-3 flex flex-wrap items-end gap-3">
                <label class="field min-w-[260px] flex-1"><span>Article</span>
                  <select class="input" value={selectedId ?? ""}
                    onChange={(e) => { setSelectedId(Number((e.target as HTMLSelectElement).value)); setSuggestions([]); setApplied(0); }}>
                    {editable.map((p) => <option key={p.id} value={p.id}>{p.title || p.keyword || "Untitled"}{p.status === "published" ? " · published" : ""}</option>)}
                  </select>
                </label>
                <button class="btn btn-primary" onClick={analyze} disabled={busy || !post || !ai}
                  title={ai ? "" : "Add OPENROUTER_API_KEY to generate suggestions"}>
                  {busy ? <Loader2 size={15} class="animate-spin" /> : <Sparkles size={15} strokeWidth={2.5} />} Analyze
                </button>
              </div>
              <p class="mt-2 text-[12px] text-muted">
                {status?.research_live
                  ? "Suggestions are grounded in the live Google SERP for the article's keyword — real competitors and the questions searchers ask."
                  : "Connect SerpAPI in Clawnify → Integrations to ground suggestions in live search data. Until then, they're AI-only."}
              </p>
            </>
          )}
        </div>

        {applied > 0 && (
          <div class="card-zone pt-0">
            <div class="flex items-center justify-between gap-3 rounded-md border border-border bg-success-tint px-3 py-2">
              <p class="text-[13px] text-success">Applied {applied} change{applied === 1 ? "" : "s"} to this draft.</p>
              <button class="btn btn-secondary btn-sm" onClick={() => navigate("/publish")}>Re-publish in Publish <ArrowRight size={13} /></button>
            </div>
          </div>
        )}

        {suggestions.length > 0 && (
          <div class="card-zone pt-2">
            <div class="mb-2 flex items-center gap-2">
              <Eyebrow>Suggestions · {suggestions.length}</Eyebrow>
              {source && <SourceBadge source={source} />}
            </div>
            <div class="divide-y divide-border overflow-hidden rounded-md border border-border">
              {suggestions.map((s, idx) => (
                <div key={s.label + idx} class="p-3">
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                      <div class="flex items-center gap-2">
                        <span class={`badge ${s.type === "meta" ? "badge-warning" : "badge-neutral"}`}>{s.type === "meta" ? "Meta" : "New section"}</span>
                        <span class="text-[13px] font-medium">{s.label}</span>
                      </div>
                      {s.why && <p class="mt-1 text-[12px] text-muted">{s.why}</p>}
                    </div>
                    <div class="flex shrink-0 gap-2">
                      <button class="btn btn-primary btn-sm" onClick={() => apply(s, idx)} disabled={applying !== null}>
                        {applying === idx ? <Loader2 size={13} class="animate-spin" /> : <Check size={13} />} Apply
                      </button>
                      <button class="btn btn-ghost btn-sm px-1.5" onClick={() => dismiss(idx)} aria-label="Dismiss"><X size={14} /></button>
                    </div>
                  </div>
                  {s.type === "meta"
                    ? <p class="mt-2 rounded bg-surface-sunken px-2 py-1.5 text-[12px]">{s.value}</p>
                    : <div class="article-prose mt-2 rounded-md border border-border p-3 text-[13px]" dangerouslySetInnerHTML={{ __html: s.value }} />}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Page>
  );
}
