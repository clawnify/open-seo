-- Topical content plans (clusters) — the SEO strategy layer. A plan groups
-- articles around a pillar topic + target audience so Produce can expand it
-- into many people-first articles that build topical authority.
CREATE TABLE IF NOT EXISTS content_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,               -- cluster / pillar topic
  keyword TEXT NOT NULL DEFAULT '', -- primary target keyword
  audience TEXT NOT NULL DEFAULT '',-- who it's for (intent / tone steer)
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);

-- Articles (core entity). Drafted by AI (Produce), scheduled and then
-- auto-published to the connected WordPress site (Publish). One row → one
-- WordPress post.
CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plan_id INTEGER REFERENCES content_plans(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT '',
  keyword TEXT NOT NULL DEFAULT '',        -- target keyword for this article
  meta_description TEXT NOT NULL DEFAULT '',
  content_html TEXT NOT NULL DEFAULT '',   -- article body as semantic HTML
  status TEXT NOT NULL DEFAULT 'draft',    -- draft | scheduled | published | failed
  scheduled_at TEXT,
  published_at TEXT,
  -- Clawnify queue job that will fire this article at scheduled_at (if any),
  -- stored so we can cancel/replace it on reschedule or unschedule.
  queue_job_id TEXT,
  -- WordPress publish result.
  wp_post_id INTEGER,
  published_url TEXT,
  error TEXT,
  -- Measure: latest live Google position of the connected site for this
  -- article's keyword (1-10 = page 1; NULL after a check = not in top 10).
  -- rank_checked_at NULL = never checked; non-NULL = last live SerpAPI lookup.
  rank INTEGER,
  rank_checked_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_scheduled ON posts(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_posts_plan ON posts(plan_id);
