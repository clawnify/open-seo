import { Plus, ExternalLink, Pencil, Trash2, Send } from "lucide-preact";
import { useApp } from "../context";
import { Toolbar, Eyebrow, EmptyState, formatDateTime } from "./ui";
import type { Post, PostStatus } from "../types";

const GROUPS: Array<{ status: PostStatus; label: string }> = [
  { status: "draft", label: "Drafts" },
  { status: "scheduled", label: "Scheduled" },
  { status: "published", label: "Published" },
  { status: "failed", label: "Failed" },
];

export function Pipeline({ navigate }: { navigate: (p: string) => void }) {
  const { posts, publishPost, deletePost, status } = useApp();

  return (
    <>
      <Toolbar title="Pipeline">
        <button class="btn btn-primary" onClick={() => navigate("/compose")}>
          <Plus size={15} strokeWidth={2.5} /> New article
        </button>
      </Toolbar>

      <div class="mx-auto max-w-[1200px] p-6">
        {posts.length === 0 ? (
          <EmptyState
            title="Nothing in the pipeline"
            hint="Generate an SEO article, schedule it, and it publishes to your WordPress site automatically."
            action={
              <button class="btn btn-primary" onClick={() => navigate("/compose")}>
                <Plus size={15} strokeWidth={2.5} /> New article
              </button>
            }
          />
        ) : (
          <div class="card">
            {GROUPS.map(({ status: st, label }) => {
              const rows = posts.filter((p) => p.status === st);
              if (rows.length === 0) return null;
              return (
                <div key={st} class="card-zone">
                  <Eyebrow>{label} · {rows.length}</Eyebrow>
                  <div class="mt-2 -mx-1">
                    {rows.map((p) => (
                      <Row
                        key={p.id}
                        post={p}
                        canPublish={!!status?.wordpress_connected}
                        onEdit={() => navigate(`/compose/${p.id}`)}
                        onPublish={() => publishPost(p.id)}
                        onDelete={() => deletePost(p.id)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

function Row({ post, canPublish, onEdit, onPublish, onDelete }: {
  post: Post; canPublish: boolean; onEdit: () => void; onPublish: () => void; onDelete: () => void;
}) {
  const when = post.status === "scheduled" ? post.scheduled_at : post.published_at || post.updated_at;
  return (
    <div class="flex items-center gap-3 rounded-md px-1 py-2 transition-colors hover:bg-surface-sunken">
      <button class="min-w-0 flex-1 text-left" onClick={onEdit}>
        <div class="truncate text-[14px] font-medium">{post.title || post.keyword || "Untitled"}</div>
        <div class="mt-0.5 flex items-center gap-2 text-[12px] text-muted">
          {post.keyword && <span class="chip">{post.keyword}</span>}
          <span class="tnum">{formatDateTime(when)}</span>
          {post.status === "failed" && post.error && <span class="truncate text-danger">{post.error}</span>}
        </div>
      </button>
      {post.published_url && (
        <a href={post.published_url} target="_blank" rel="noreferrer" class="btn btn-ghost btn-sm px-1.5" aria-label="View live article">
          <ExternalLink size={14} />
        </a>
      )}
      <button class="btn btn-ghost btn-sm px-1.5" onClick={onEdit} aria-label="Edit article"><Pencil size={14} /></button>
      {post.status !== "published" && (
        <button class="btn btn-secondary btn-sm" onClick={onPublish} disabled={!canPublish} title={canPublish ? "" : "Connect WordPress to publish"} aria-label="Publish now">
          <Send size={13} /> Publish
        </button>
      )}
      <button class="btn btn-danger btn-sm px-1.5" onClick={onDelete} aria-label="Delete article"><Trash2 size={14} /></button>
    </div>
  );
}
