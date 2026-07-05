import { useState } from "preact/hooks";
import { Plus, Sparkles, Trash2, Loader2, FileText } from "lucide-preact";
import { useApp } from "../context";
import { Toolbar, Eyebrow, EmptyState } from "./ui";
import type { Plan } from "../types";

export function Plans({ navigate }: { navigate: (p: string) => void }) {
  const { plans, createPlan, deletePlan } = useApp();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", keyword: "", audience: "", notes: "" });

  const submit = async () => {
    if (!form.name.trim()) return;
    const created = await createPlan(form);
    if (created) { setForm({ name: "", keyword: "", audience: "", notes: "" }); setCreating(false); }
  };

  return (
    <>
      <Toolbar title="Content plans">
        <button class="btn btn-primary" onClick={() => setCreating((v) => !v)}>
          <Plus size={15} strokeWidth={2.5} /> New plan
        </button>
      </Toolbar>

      <div class="mx-auto max-w-[1200px] space-y-4 p-6">
        {creating && (
          <div class="card">
            <div class="card-zone space-y-3">
              <Eyebrow>New content cluster</Eyebrow>
              <label class="field"><span>Cluster / pillar topic</span>
                <input class="input" value={form.name} placeholder="e.g. WordPress SEO basics"
                  onInput={(e) => setForm({ ...form, name: (e.target as HTMLInputElement).value })} />
              </label>
              <div class="grid gap-3 sm:grid-cols-2">
                <label class="field"><span>Primary keyword</span>
                  <input class="input" value={form.keyword} placeholder="wordpress seo"
                    onInput={(e) => setForm({ ...form, keyword: (e.target as HTMLInputElement).value })} />
                </label>
                <label class="field"><span>Target audience</span>
                  <input class="input" value={form.audience} placeholder="small business owners"
                    onInput={(e) => setForm({ ...form, audience: (e.target as HTMLInputElement).value })} />
                </label>
              </div>
              <div class="flex justify-end gap-2">
                <button class="btn btn-secondary" onClick={() => setCreating(false)}>Cancel</button>
                <button class="btn btn-primary" onClick={submit} disabled={!form.name.trim()}>Create plan</button>
              </div>
            </div>
          </div>
        )}

        {plans.length === 0 && !creating ? (
          <EmptyState
            title="No content plans yet"
            hint="A plan groups articles around a pillar topic so you can build topical authority. Create one, then generate article ideas from it."
            action={<button class="btn btn-primary" onClick={() => setCreating(true)}><Plus size={15} strokeWidth={2.5} /> New plan</button>}
          />
        ) : (
          plans.map((plan) => <PlanCard key={plan.id} plan={plan} navigate={navigate} onDelete={() => deletePlan(plan.id)} />)
        )}
      </div>
    </>
  );
}

function PlanCard({ plan, navigate, onDelete }: { plan: Plan; navigate: (p: string) => void; onDelete: () => void }) {
  const { generateIdeas, generateArticle } = useApp();
  const [ideas, setIdeas] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [draftingIdx, setDraftingIdx] = useState<number | null>(null);

  const runIdeas = async () => {
    setBusy(true);
    setIdeas(await generateIdeas(plan.name || plan.keyword, plan.audience, 8));
    setBusy(false);
  };

  const draft = async (title: string, idx: number) => {
    setDraftingIdx(idx);
    const post = await generateArticle({ keyword: plan.keyword || title, title, plan_id: plan.id });
    setDraftingIdx(null);
    if (post) navigate(`/compose/${post.id}`);
  };

  return (
    <div class="card">
      <div class="card-zone">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <Eyebrow>Cluster</Eyebrow>
            <div class="mt-1 text-[15px] font-semibold">{plan.name}</div>
            <div class="mt-1.5 flex flex-wrap items-center gap-1.5">
              {plan.keyword && <span class="chip">{plan.keyword}</span>}
              {plan.audience && <span class="chip">{plan.audience}</span>}
            </div>
          </div>
          <div class="flex shrink-0 items-center gap-2">
            <button class="btn btn-secondary btn-sm" onClick={runIdeas} disabled={busy}>
              {busy ? <Loader2 size={13} class="animate-spin" /> : <Sparkles size={13} />} Generate ideas
            </button>
            <button class="btn btn-danger btn-sm px-1.5" onClick={onDelete} aria-label="Delete plan"><Trash2 size={14} /></button>
          </div>
        </div>
      </div>

      {ideas.length > 0 && (
        <div class="card-zone">
          <Eyebrow>Article ideas · {ideas.length}</Eyebrow>
          <div class="mt-2 -mx-1">
            {ideas.map((title, idx) => (
              <div key={idx} class="flex items-center gap-3 rounded-md px-1 py-1.5 hover:bg-surface-sunken">
                <span class="min-w-0 flex-1 truncate text-[13px]">{title}</span>
                <button class="btn btn-secondary btn-sm" onClick={() => draft(title, idx)} disabled={draftingIdx !== null}>
                  {draftingIdx === idx ? <Loader2 size={13} class="animate-spin" /> : <FileText size={13} />} Draft
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
