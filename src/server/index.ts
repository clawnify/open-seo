import { createApp } from "@clawnify/app";
import type { CredentialBinding } from "@clawnify/connections";
import { query, get, run } from "./db";
import { scheduleDelivery, cancelDelivery, verifyDelivery } from "./queue";
import { generateArticle, generateIdeas, type PlanContext } from "./ai";
import { publishArticle, wordpressConnected } from "./wordpress";
import { researchConnected, discoverKeywords, researchCompetitors } from "./research";
import { refreshRankings } from "./measure";
import { suggestImprovements } from "./optimize";

type Env = {
  Bindings: {
    DB: D1Database;
    // Credentials broker binding + org id — injected by the builder in
    // production. Powers Research's live search-data pull (SerpAPI) via
    // @clawnify/connections. Absent in local dev → Research falls back to AI.
    CREDENTIALS?: CredentialBinding;
    CLAWNIFY_ORG_ID?: string;
    // Managed-service token (injected by the builder) — authorizes the queue
    // service that fires scheduled articles.
    CLAWNIFY_TOKEN?: string;
    // Produce: OpenRouter key (injected via clawnify.json env), optional model.
    OPENROUTER_API_KEY?: string;
    SEO_MODEL?: string;
    // Publish: self-hosted WordPress creds, injected from the localOnly
    // `wordpress` connection's credentialEnv mapping. See wordpress.ts.
    WORDPRESS_SITE_URL?: string;
    WORDPRESS_USERNAME?: string;
    WORDPRESS_PASSWORD?: string;
  };
};

// Publish one article to WordPress and record the outcome on its row. Shared by
// the manual "publish now" endpoint and the scheduled /internal/publish
// delivery.
async function publishPost(
  env: Env["Bindings"],
  id: number,
): Promise<{ ok: boolean; url?: string; error?: string } | null> {
  const post = await get<any>("SELECT * FROM posts WHERE id = ?", [id]);
  if (!post) return null;
  if (!post.content_html?.trim()) return { ok: false, error: "Article has no content to publish." };

  const r = await publishArticle(env, {
    title: post.title || post.keyword || "Untitled",
    contentHtml: post.content_html,
    excerpt: post.meta_description || undefined,
  });

  await run(
    `UPDATE posts
       SET status = ?, wp_post_id = ?, published_url = ?, error = ?,
           published_at = CASE WHEN ? THEN datetime('now') ELSE published_at END,
           updated_at = datetime('now')
     WHERE id = ?`,
    [
      r.ok ? "published" : "failed",
      r.wpPostId ?? null,
      r.url ?? null,
      r.ok ? null : r.error ?? "Publish failed",
      r.ok ? 1 : 0,
      id,
    ],
  );
  return { ok: r.ok, url: r.url, error: r.error };
}

// Reconcile an article's queue job with its current schedule. Enqueues a
// delivery when scheduled with a future time; cancels a prior job on
// reschedule/unschedule. No-op in local dev (no CLAWNIFY_TOKEN).
async function syncSchedule(
  env: Env["Bindings"],
  origin: string,
  postId: number,
  status: string,
  scheduledAt: string | null,
  existingJobId: string | null,
): Promise<void> {
  const token = env.CLAWNIFY_TOKEN;
  if (existingJobId && token) await cancelDelivery(token, existingJobId);

  let newJobId: string | null = null;
  if (token && status === "scheduled" && scheduledAt) {
    newJobId = await scheduleDelivery({ token, origin, postId, runAt: scheduledAt });
  }
  await run("UPDATE posts SET queue_job_id = ? WHERE id = ?", [newJobId, postId]);
}

async function planContext(planId: number | null | undefined): Promise<PlanContext | null> {
  if (!planId) return null;
  const p = await get<any>("SELECT * FROM content_plans WHERE id = ?", [planId]);
  if (!p) return null;
  return { name: p.name, keyword: p.keyword, audience: p.audience, notes: p.notes };
}

const app = createApp<Env>({
  title: "Open SEO",
  version: "1.0.0",
  description: "SEO content engine — keyword research, article production, scheduling, and WordPress publishing.",
});

// ── Status ──

app.get("/api/status", async (c) =>
  c.json({
    wordpress_connected: wordpressConnected(c.env),
    ai: !!c.env.OPENROUTER_API_KEY,
    research_live: await researchConnected(c.env),
  }),
);

// ── Research: keyword discovery + competitor SERP ──

// Seed topic → prioritized keyword ideas (live SerpAPI signals when connected,
// AI-estimated otherwise). source tells the UI which tier answered.
app.post("/api/research/keywords", async (c) => {
  const { seed, audience } = await c.req.json<{ seed: string; audience?: string }>();
  if (!seed?.trim()) return c.json({ error: "seed required" }, 400);
  try {
    return c.json(await discoverKeywords(c.env, { seed: seed.trim(), audience: audience?.trim() || undefined }));
  } catch (e: any) {
    return c.json({ error: e.message || "Keyword research failed" }, 502);
  }
});

// Seed keyword → who currently ranks + content gaps. Live-only ({ live:false }
// when SerpAPI isn't connected).
app.post("/api/research/competitors", async (c) => {
  const { seed } = await c.req.json<{ seed: string }>();
  if (!seed?.trim()) return c.json({ error: "seed required" }, 400);
  try {
    return c.json(await researchCompetitors(c.env, { seed: seed.trim() }));
  } catch (e: any) {
    return c.json({ error: e.message || "Competitor research failed" }, 502);
  }
});

// ── Measure: live keyword rank tracking ──

// Check a bounded batch of published articles' live Google positions and
// persist them on the posts. Live-only ({ live:false } without SerpAPI).
app.post("/api/measure/rankings/refresh", async (c) => {
  try {
    return c.json(await refreshRankings(c.env));
  } catch (e: any) {
    return c.json({ error: e.message || "Rank check failed" }, 502);
  }
});

// ── Optimize: data-driven rewrite suggestions ──

// One article → apply-able improvements grounded in the live SERP (AI-only
// fallback). The client applies accepted suggestions via /api/posts/:id.
app.post("/api/optimize/suggest", async (c) => {
  const { post_id } = await c.req.json<{ post_id: number }>();
  if (!post_id) return c.json({ error: "post_id required" }, 400);
  try {
    const result = await suggestImprovements(c.env, post_id);
    if (!result) return c.json({ error: "Article not found" }, 404);
    return c.json(result);
  } catch (e: any) {
    return c.json({ error: e.message || "Optimization failed" }, 502);
  }
});

// ── Content plans (clusters) ──

app.get("/api/plans", async (c) => {
  const rows = await query("SELECT * FROM content_plans ORDER BY created_at DESC");
  return c.json(rows);
});

app.post("/api/plans", async (c) => {
  const { name, keyword, audience, notes } = await c.req.json<{
    name: string; keyword?: string; audience?: string; notes?: string;
  }>();
  if (!name?.trim()) return c.json({ error: "Name required" }, 400);
  const result = await run(
    "INSERT INTO content_plans (name, keyword, audience, notes) VALUES (?, ?, ?, ?)",
    [name.trim(), keyword?.trim() || "", audience?.trim() || "", notes?.trim() || ""],
  );
  const row = await get("SELECT * FROM content_plans WHERE id = ?", [result.lastInsertRowid]);
  return c.json(row, 201);
});

app.put("/api/plans/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const existing = await get<any>("SELECT * FROM content_plans WHERE id = ?", [id]);
  if (!existing) return c.json({ error: "Not found" }, 404);
  const { name, keyword, audience, notes } = await c.req.json<{
    name?: string; keyword?: string; audience?: string; notes?: string;
  }>();
  await run(
    "UPDATE content_plans SET name = ?, keyword = ?, audience = ?, notes = ? WHERE id = ?",
    [name ?? existing.name, keyword ?? existing.keyword, audience ?? existing.audience, notes ?? existing.notes, id],
  );
  return c.json(await get("SELECT * FROM content_plans WHERE id = ?", [id]));
});

app.delete("/api/plans/:id", async (c) => {
  await run("DELETE FROM content_plans WHERE id = ?", [Number(c.req.param("id"))]);
  return c.json({ ok: true });
});

// ── Produce: generate ideas + full articles ──

// Expand a topic/cluster into article title ideas (no persistence — the UI
// turns chosen ideas into drafts via /api/generate).
app.post("/api/ideas", async (c) => {
  const { topic, audience, count } = await c.req.json<{ topic: string; audience?: string; count?: number }>();
  if (!topic?.trim()) return c.json({ error: "topic required" }, 400);
  try {
    const titles = await generateIdeas(c.env, { topic: topic.trim(), audience, count });
    return c.json({ titles });
  } catch (e: any) {
    return c.json({ error: e.message || "Idea generation failed" }, 502);
  }
});

// Generate a full article draft and persist it as a post.
app.post("/api/generate", async (c) => {
  const { keyword, title, plan_id } = await c.req.json<{ keyword: string; title?: string; plan_id?: number }>();
  if (!keyword?.trim()) return c.json({ error: "keyword required" }, 400);
  try {
    const article = await generateArticle(c.env, {
      keyword: keyword.trim(),
      title: title?.trim(),
      plan: await planContext(plan_id),
    });
    const result = await run(
      `INSERT INTO posts (plan_id, title, keyword, meta_description, content_html, status)
       VALUES (?, ?, ?, ?, ?, 'draft')`,
      [plan_id ?? null, article.title, keyword.trim(), article.meta_description, article.content_html],
    );
    const post = await get("SELECT * FROM posts WHERE id = ?", [result.lastInsertRowid]);
    return c.json(post, 201);
  } catch (e: any) {
    return c.json({ error: e.message || "Article generation failed" }, 502);
  }
});

// ── Posts (articles) ──

app.get("/api/posts", async (c) => {
  const status = c.req.query("status");
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (status) {
    const statuses = status.split(",").map((s) => s.trim()).filter(Boolean);
    if (statuses.length === 1) {
      conditions.push("status = ?");
      params.push(statuses[0]);
    } else if (statuses.length > 1) {
      conditions.push(`status IN (${statuses.map(() => "?").join(", ")})`);
      params.push(...statuses);
    }
  }
  let sql = "SELECT * FROM posts";
  if (conditions.length) sql += " WHERE " + conditions.join(" AND ");
  sql += " ORDER BY COALESCE(scheduled_at, created_at) DESC";
  return c.json(await query(sql, params));
});

app.get("/api/posts/calendar", async (c) => {
  const month = c.req.query("month"); // YYYY-MM
  if (!month) return c.json({ error: "month param required (YYYY-MM)" }, 400);
  const from = `${month}-01T00:00:00`;
  const [y, m] = month.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const to = `${month}-${String(lastDay).padStart(2, "0")}T23:59:59`;
  const rows = await query<any>(
    "SELECT * FROM posts WHERE scheduled_at >= ? AND scheduled_at <= ? ORDER BY scheduled_at ASC",
    [from, to],
  );
  const grouped: Record<string, any[]> = {};
  for (const post of rows) {
    const day = post.scheduled_at?.slice(0, 10) || "unscheduled";
    (grouped[day] ||= []).push(post);
  }
  return c.json(grouped);
});

app.get("/api/posts/:id", async (c) => {
  const post = await get("SELECT * FROM posts WHERE id = ?", [Number(c.req.param("id"))]);
  if (!post) return c.json({ error: "Not found" }, 404);
  return c.json(post);
});

app.post("/api/posts", async (c) => {
  const { plan_id, title, keyword, meta_description, content_html, status, scheduled_at } = await c.req.json<{
    plan_id?: number | null; title?: string; keyword?: string; meta_description?: string;
    content_html?: string; status?: string; scheduled_at?: string | null;
  }>();
  const postStatus = status || (scheduled_at ? "scheduled" : "draft");
  const result = await run(
    `INSERT INTO posts (plan_id, title, keyword, meta_description, content_html, status, scheduled_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [plan_id ?? null, title || "", keyword || "", meta_description || "", content_html || "", postStatus, scheduled_at || null],
  );
  const postId = Number(result.lastInsertRowid);
  await syncSchedule(c.env, new URL(c.req.url).origin, postId, postStatus, scheduled_at || null, null);
  return c.json(await get("SELECT * FROM posts WHERE id = ?", [postId]), 201);
});

app.put("/api/posts/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const existing = await get<any>("SELECT * FROM posts WHERE id = ?", [id]);
  if (!existing) return c.json({ error: "Not found" }, 404);
  const body = await c.req.json<{
    plan_id?: number | null; title?: string; keyword?: string; meta_description?: string;
    content_html?: string; status?: string; scheduled_at?: string | null;
  }>();

  const status = body.status ?? existing.status;
  const scheduledAt = body.scheduled_at !== undefined ? body.scheduled_at : existing.scheduled_at;
  await run(
    `UPDATE posts SET plan_id = ?, title = ?, keyword = ?, meta_description = ?,
       content_html = ?, status = ?, scheduled_at = ?, updated_at = datetime('now')
     WHERE id = ?`,
    [
      body.plan_id !== undefined ? body.plan_id : existing.plan_id,
      body.title ?? existing.title,
      body.keyword ?? existing.keyword,
      body.meta_description ?? existing.meta_description,
      body.content_html ?? existing.content_html,
      status,
      scheduledAt,
      id,
    ],
  );
  await syncSchedule(c.env, new URL(c.req.url).origin, id, status, scheduledAt || null, existing.queue_job_id ?? null);
  return c.json(await get("SELECT * FROM posts WHERE id = ?", [id]));
});

app.delete("/api/posts/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const existing = await get<any>("SELECT queue_job_id FROM posts WHERE id = ?", [id]);
  if (existing?.queue_job_id && c.env.CLAWNIFY_TOKEN) {
    await cancelDelivery(c.env.CLAWNIFY_TOKEN, existing.queue_job_id);
  }
  await run("DELETE FROM posts WHERE id = ?", [id]);
  return c.json({ ok: true });
});

// ── Publish (manual — "publish now" from the dashboard) ──

app.post("/api/posts/:id/publish", async (c) => {
  const id = Number(c.req.param("id"));
  const result = await publishPost(c.env, id);
  if (!result) return c.json({ error: "Article not found" }, 404);
  if (!result.ok) return c.json({ error: result.error || "Publish failed" }, 400);
  return c.json(result);
});

// ── Scheduled delivery (called by the Clawnify queue at scheduled_at) ──
//
// Must live under /api/ (the builder only routes /api/* to this server) and is
// declared public in clawnify.json so the queue's tokenless server-to-server
// POST clears the perimeter; authenticity is enforced by the HMAC signature.
app.post("/api/internal/publish", async (c) => {
  const raw = await c.req.text();
  const valid = await verifyDelivery(raw, {
    signature: c.req.header("X-Queue-Signature"),
    timestamp: c.req.header("X-Queue-Timestamp"),
    keyId: c.req.header("X-Queue-Key-Id"),
  });
  if (!valid) return c.json({ error: "invalid signature" }, 401);

  const { post_id } = JSON.parse(raw || "{}") as { post_id?: number };
  if (!post_id) return c.json({ error: "post_id required" }, 400);

  // The job already fired — clear its id so reconciliation doesn't cancel a
  // delivered job.
  await run("UPDATE posts SET queue_job_id = NULL WHERE id = ?", [post_id]);

  const result = await publishPost(c.env, post_id);
  if (!result) return c.json({ error: "article not found" }, 404);
  // 200 even on a WordPress-level rejection — that isn't a delivery failure to
  // retry; the row records status=failed + the error for the dashboard.
  return c.json(result);
});

// ── Stats ──

app.get("/api/stats", async (c) => {
  const count = async (where = "") =>
    (await get<{ n: number }>(`SELECT COUNT(*) as n FROM posts ${where}`))?.n || 0;
  const daily = await query(
    `SELECT date(scheduled_at) as day, COUNT(*) as count
     FROM posts WHERE scheduled_at >= datetime('now', '-30 days')
     GROUP BY day ORDER BY day ASC`,
  );
  return c.json({
    total: await count(),
    drafts: await count("WHERE status = 'draft'"),
    scheduled: await count("WHERE status = 'scheduled'"),
    published: await count("WHERE status = 'published'"),
    failed: await count("WHERE status = 'failed'"),
    plans: (await get<{ n: number }>("SELECT COUNT(*) as n FROM content_plans"))?.n || 0,
    daily,
  });
});

export default app;
