import { useState } from "preact/hooks";
import { Plus, Trash2, ArrowRight } from "lucide-preact";
import { useApp } from "../context";
import { Eyebrow, EmptyState, Phase2Empty } from "./ui";

export function Research({ navigate }: { navigate: (p: string) => void }) {
  const { plans, createPlan, deletePlan } = useApp();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", keyword: "", audience: "" });

  const submit = async () => {
    if (!form.name.trim()) return;
    const created = await createPlan(form);
    if (created) { setForm({ name: "", keyword: "", audience: "" }); setCreating(false); }
  };

  return (
    <div class="mx-auto max-w-[1100px] space-y-4 p-6">
      <div class="flex items-end justify-between gap-3">
        <div>
          <h1 class="text-[20px] font-bold tracking-tight">Research</h1>
          <p class="mt-0.5 text-[13px] text-muted">Group your topics into clusters, then uncover the keywords worth ranking for.</p>
        </div>
        <button class="btn btn-primary" onClick={() => setCreating((v) => !v)}>
          <Plus size={15} strokeWidth={2.5} /> New plan
        </button>
      </div>

      {/* Content plans (live) */}
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
              <button class="btn btn-primary" onClick={submit} disabled={!form.name.trim()}>Create plan</button>
            </div>
          </div>
        )}

        {plans.length === 0 && !creating ? (
          <div class="card-zone pt-3">
            <EmptyState
              title="No content plans yet"
              hint="A plan groups articles around a pillar topic so you build topical authority. Create one, then produce articles against it."
              action={<button class="btn btn-primary" onClick={() => setCreating(true)}><Plus size={15} strokeWidth={2.5} /> New plan</button>}
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

      {/* Keyword discovery (Phase 2) */}
      <div class="card">
        <div class="card-zone pb-0"><Eyebrow>Keyword discovery</Eyebrow></div>
        <div class="card-zone pt-2">
          <Phase2Empty
            title="Automated keyword & competitor research"
            hint="Discover ranking opportunities, content gaps, and competitor keywords — pulled from live search data. Wiring up next."
          />
        </div>
      </div>
    </div>
  );
}
