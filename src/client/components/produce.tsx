import { useState } from "preact/hooks";
import { Sparkles, FileText, Loader2, Pencil, Trash2, ArrowRight } from "lucide-preact";
import { useApp } from "../context";
import { Eyebrow, EmptyState, StatusBadge, formatDateTime } from "./ui";

export function Produce({ navigate }: { navigate: (p: string) => void }) {
  const { plans, posts, generateArticle, generateIdeas, deletePost } = useApp();
  const [keyword, setKeyword] = useState("");
  const [planId, setPlanId] = useState<number | null>(null);
  const [genning, setGenning] = useState(false);

  const [topic, setTopic] = useState("");
  const [ideas, setIdeas] = useState<string[]>([]);
  const [ideasBusy, setIdeasBusy] = useState(false);
  const [draftingIdx, setDraftingIdx] = useState<number | null>(null);

  const drafts = posts.filter((p) => p.status === "draft");

  const generate = async () => {
    if (!keyword.trim()) return;
    setGenning(true);
    const post = await generateArticle({ keyword: keyword.trim(), plan_id: planId ?? undefined });
    setGenning(false);
    if (post) navigate(`/compose/${post.id}`);
  };

  const runIdeas = async () => {
    if (!topic.trim()) return;
    setIdeasBusy(true);
    setIdeas(await generateIdeas(topic.trim(), undefined, 8));
    setIdeasBusy(false);
  };

  const draftIdea = async (title: string, idx: number) => {
    setDraftingIdx(idx);
    const post = await generateArticle({ keyword: topic.trim() || title, title, plan_id: planId ?? undefined });
    setDraftingIdx(null);
    if (post) navigate(`/compose/${post.id}`);
  };

  return (
    <div class="mx-auto max-w-[1100px] space-y-4 p-6">
      <div>
        <h1 class="text-[20px] font-bold tracking-tight">Produce</h1>
        <p class="mt-0.5 text-[13px] text-muted">Turn keywords and topical clusters into people-first articles.</p>
      </div>

      {/* Generate a single article */}
      <div class="card">
        <div class="card-zone">
          <Eyebrow>Generate article</Eyebrow>
          <div class="mt-3 flex flex-wrap items-end gap-3">
            <label class="field min-w-[240px] flex-1"><span>Target keyword</span>
              <input class="input" value={keyword} placeholder="wordpress seo for small business"
                onInput={(e) => setKeyword((e.target as HTMLInputElement).value)}
                onKeyDown={(e) => e.key === "Enter" && generate()} />
            </label>
            <label class="field w-56"><span>Content plan (optional)</span>
              <select class="input" value={planId ?? ""}
                onChange={(e) => setPlanId((e.target as HTMLSelectElement).value ? Number((e.target as HTMLSelectElement).value) : null)}>
                <option value="">No plan</option>
                {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
            <button class="btn btn-primary" onClick={generate} disabled={genning || !keyword.trim()}>
              {genning ? <Loader2 size={15} class="animate-spin" /> : <Sparkles size={15} strokeWidth={2.5} />} Generate article
            </button>
          </div>
        </div>

        {/* Idea expansion */}
        <div class="card-zone">
          <Eyebrow>Ideas from a topic</Eyebrow>
          <div class="mt-3 flex flex-wrap items-end gap-3">
            <label class="field min-w-[240px] flex-1"><span>Topic or cluster</span>
              <input class="input" value={topic} placeholder="wordpress seo basics"
                onInput={(e) => setTopic((e.target as HTMLInputElement).value)}
                onKeyDown={(e) => e.key === "Enter" && runIdeas()} />
            </label>
            <button class="btn btn-secondary" onClick={runIdeas} disabled={ideasBusy || !topic.trim()}>
              {ideasBusy ? <Loader2 size={14} class="animate-spin" /> : <Sparkles size={14} />} Generate ideas
            </button>
          </div>
          {ideas.length > 0 && (
            <div class="mt-3 overflow-hidden rounded-md border border-border">
              <table class="tbl">
                <thead><tr><th>Article idea</th><th class="w-24"></th></tr></thead>
                <tbody>
                  {ideas.map((title, idx) => (
                    <tr key={idx}>
                      <td>{title}</td>
                      <td class="text-right">
                        <button class="btn btn-secondary btn-sm" onClick={() => draftIdea(title, idx)} disabled={draftingIdx !== null}>
                          {draftingIdx === idx ? <Loader2 size={13} class="animate-spin" /> : <FileText size={13} />} Draft
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Drafts */}
      <div class="card">
        <div class="card-zone pb-0"><Eyebrow>Drafts · {drafts.length}</Eyebrow></div>
        {drafts.length === 0 ? (
          <div class="card-zone pt-3">
            <EmptyState title="No drafts yet" hint="Generate an article above — it lands here as a draft you can edit, then schedule from Publish." />
          </div>
        ) : (
          <div class="card-zone pt-3">
            <div class="overflow-x-auto rounded-md border border-border">
              <table class="tbl">
                <thead><tr><th>Title</th><th>Keyword</th><th>Plan</th><th class="num">Updated</th><th class="w-28"></th></tr></thead>
                <tbody>
                  {drafts.map((p) => {
                    const plan = plans.find((pl) => pl.id === p.plan_id);
                    return (
                      <tr key={p.id} class="cursor-pointer" onClick={() => navigate(`/compose/${p.id}`)}>
                        <td class="font-medium">{p.title || "Untitled"}</td>
                        <td>{p.keyword ? <span class="chip">{p.keyword}</span> : <span class="text-faint">—</span>}</td>
                        <td class="text-muted">{plan?.name || "—"}</td>
                        <td class="num text-muted">{formatDateTime(p.updated_at)}</td>
                        <td class="text-right" onClick={(e) => e.stopPropagation()}>
                          <button class="btn btn-ghost btn-sm px-1.5" onClick={() => navigate(`/compose/${p.id}`)} aria-label="Edit"><Pencil size={14} /></button>
                          <button class="btn btn-danger btn-sm px-1.5" onClick={() => deletePost(p.id)} aria-label="Delete"><Trash2 size={14} /></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div class="mt-3 flex justify-end">
              <button class="btn btn-ghost btn-sm" onClick={() => navigate("/publish")}>Schedule drafts in Publish <ArrowRight size={13} /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
