import { useState, useEffect } from "preact/hooks";
import { Sparkles, Save, Send, Loader2, ArrowLeft } from "lucide-preact";
import { api } from "../api";
import { useApp } from "../context";
import { Toolbar, Eyebrow, StatusBadge, toLocalInput, fromLocalInput } from "./ui";
import type { Post, PostStatus } from "../types";

interface Form {
  plan_id: number | null;
  keyword: string;
  title: string;
  meta_description: string;
  content_html: string;
  scheduled_at: string; // datetime-local value
}

const EMPTY: Form = { plan_id: null, keyword: "", title: "", meta_description: "", content_html: "", scheduled_at: "" };

export function Composer({ editId, navigate }: { editId: number | null; navigate: (p: string) => void }) {
  const { plans, createPost, updatePost, publishPost, generateArticle, status } = useApp();
  const [form, setForm] = useState<Form>(EMPTY);
  const [existing, setExisting] = useState<Post | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (editId == null) { setExisting(null); setForm(EMPTY); return; }
    api<Post>("GET", `/api/posts/${editId}`).then((p) => {
      setExisting(p);
      setForm({
        plan_id: p.plan_id,
        keyword: p.keyword,
        title: p.title,
        meta_description: p.meta_description,
        content_html: p.content_html,
        scheduled_at: toLocalInput(p.scheduled_at),
      });
    }).catch(() => {});
  }, [editId]);

  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }));

  const generate = async () => {
    if (!form.keyword.trim()) return;
    setGenerating(true);
    const post = await generateArticle({ keyword: form.keyword.trim(), title: form.title.trim() || undefined, plan_id: form.plan_id ?? undefined });
    setGenerating(false);
    if (post) navigate(`/compose/${post.id}`);
  };

  // Persist the current form; returns the post id (creating on first save).
  const persist = async (): Promise<number | null> => {
    const scheduledIso = fromLocalInput(form.scheduled_at);
    const nextStatus: PostStatus = scheduledIso ? "scheduled" : existing?.status === "published" ? "published" : "draft";
    const payload = {
      plan_id: form.plan_id,
      keyword: form.keyword,
      title: form.title,
      meta_description: form.meta_description,
      content_html: form.content_html,
      status: nextStatus,
      scheduled_at: scheduledIso,
    };
    if (existing) { const p = await updatePost(existing.id, payload); return p?.id ?? existing.id; }
    const p = await createPost(payload); return p?.id ?? null;
  };

  const save = async () => { setSaving(true); const id = await persist(); setSaving(false); if (id) navigate("/produce"); };

  const publishNow = async () => {
    setPublishing(true);
    const id = await persist();
    if (id) await publishPost(id);
    setPublishing(false);
    if (id) navigate("/produce");
  };

  const hasContent = form.content_html.trim().length > 0;
  const wpConnected = !!status?.wordpress_connected;

  return (
    <>
      <Toolbar title={existing ? "Edit article" : "New article"}>
        <button class="btn btn-ghost btn-sm" onClick={() => navigate("/produce")}><ArrowLeft size={14} /> Back</button>
        {existing && <StatusBadge status={existing.status} />}
      </Toolbar>

      <div class="max-w-[900px] space-y-4 px-6 py-5">
        {/* Produce — generate a fresh draft (new articles only) */}
        {!existing && (
          <div class="card">
            <div class="card-zone space-y-3">
              <Eyebrow>Produce</Eyebrow>
              <div class="grid gap-3 sm:grid-cols-2">
                <label class="field"><span>Target keyword</span>
                  <input class="input" value={form.keyword} placeholder="wordpress seo tips"
                    onInput={(e) => set({ keyword: (e.target as HTMLInputElement).value })} />
                </label>
                <label class="field"><span>Content plan (optional)</span>
                  <select class="input" value={form.plan_id ?? ""}
                    onChange={(e) => set({ plan_id: (e.target as HTMLSelectElement).value ? Number((e.target as HTMLSelectElement).value) : null })}>
                    <option value="">No plan</option>
                    {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </label>
              </div>
              <label class="field"><span>Working title / angle (optional)</span>
                <input class="input" value={form.title} placeholder="Leave blank to let AI choose"
                  onInput={(e) => set({ title: (e.target as HTMLInputElement).value })} />
              </label>
              <div class="flex items-center justify-between">
                <p class="text-[12px] text-muted">Generates a people-first article draft you can edit below.</p>
                <button class="btn btn-secondary" onClick={generate} disabled={generating || !form.keyword.trim()}>
                  {generating ? <Loader2 size={14} class="animate-spin" /> : <Sparkles size={14} />} Generate article
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Article fields */}
        <div class="card">
          <div class="card-zone space-y-3">
            <Eyebrow>Article</Eyebrow>
            <label class="field"><span>Title</span>
              <input class="input" value={form.title}
                onInput={(e) => set({ title: (e.target as HTMLInputElement).value })} />
            </label>
            <label class="field"><span>Meta description</span>
              <textarea class="input" rows={2} value={form.meta_description}
                onInput={(e) => set({ meta_description: (e.target as HTMLTextAreaElement).value })} />
            </label>
            <label class="field"><span>Content (HTML)</span>
              <textarea class="input font-mono text-[12px]" rows={12} value={form.content_html}
                placeholder="Generate above, or write semantic HTML here."
                onInput={(e) => set({ content_html: (e.target as HTMLTextAreaElement).value })} />
            </label>
          </div>

          {hasContent && (
            <div class="card-zone">
              <Eyebrow>Preview</Eyebrow>
              <div class="article-prose mt-2" dangerouslySetInnerHTML={{ __html: form.content_html }} />
            </div>
          )}

          <div class="card-zone">
            <Eyebrow>Publish</Eyebrow>
            <div class="mt-2 flex flex-wrap items-end justify-between gap-3">
              <label class="field"><span>Schedule (optional — auto-publishes to WordPress)</span>
                <input type="datetime-local" class="input w-auto" value={form.scheduled_at}
                  onInput={(e) => set({ scheduled_at: (e.target as HTMLInputElement).value })} />
              </label>
              <div class="flex items-center gap-2">
                <button class="btn btn-secondary" onClick={publishNow} disabled={publishing || saving || !hasContent || !wpConnected}
                  title={wpConnected ? "" : "Connect WordPress to publish"}>
                  {publishing ? <Loader2 size={14} class="animate-spin" /> : <Send size={14} />} Publish now
                </button>
                <button class="btn btn-primary" onClick={save} disabled={saving || publishing}>
                  {saving ? <Loader2 size={14} class="animate-spin" /> : <Save size={14} />}
                  {form.scheduled_at ? " Schedule" : " Save draft"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
