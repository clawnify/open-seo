/**
 * Measure — live keyword rank tracking. For each published article, find where
 * the connected WordPress site currently ranks on Google for that article's
 * target keyword, through the same SerpAPI connection Research uses. The latest
 * position is persisted on the post (rank + rank_checked_at) so the dashboard
 * reads stored ranks instead of re-hitting the API on every view.
 *
 * Rank checks are bounded per refresh (Worker time + SerpAPI rate limits): we
 * check the least-recently-checked articles first, a small batch at a time, and
 * report how many are still unchecked so the user can run it again.
 * // shortcut: page-1 (top-10) position only, exact-host match; paginate
 * // SerpAPI for deeper ranks and add a history table for trends when needed.
 */

import { query, get, run } from "./db";
import type { ConnectionsEnv } from "@clawnify/connections";
import { serpSearch, domainOf, researchConnected } from "./research";

const BATCH = 10; // max keywords checked per refresh call

export type RankingsRefresh =
  | { live: false }
  | { live: true; domain: string | null; checked: number; unchecked: number };

/** The connected site's domain — the property we track rankings for. */
async function ownDomain(env: ConnectionsEnv): Promise<string | null> {
  const site = typeof env.WORDPRESS_SITE_URL === "string" ? env.WORDPRESS_SITE_URL : "";
  if (site) return domainOf(site);
  // Fallback: infer from any already-published URL.
  const row = await get<{ published_url: string | null }>(
    "SELECT published_url FROM posts WHERE published_url IS NOT NULL AND published_url != '' LIMIT 1",
  );
  return row?.published_url ? domainOf(row.published_url) : null;
}

/**
 * Check live Google positions for a bounded batch of published articles and
 * persist them. Live-only — returns { live:false } when SerpAPI isn't connected.
 */
export async function refreshRankings(env: ConnectionsEnv): Promise<RankingsRefresh> {
  if (!(await researchConnected(env))) return { live: false };
  const domain = await ownDomain(env);

  // Least-recently-checked first (never-checked NULLs sort first in SQLite).
  const posts = await query<{ id: number; keyword: string }>(
    `SELECT id, keyword FROM posts
      WHERE status = 'published' AND keyword != ''
      ORDER BY rank_checked_at ASC
      LIMIT ?`,
    [BATCH],
  );

  let checked = 0;
  for (const p of posts) {
    const serp = await serpSearch(env, p.keyword);
    // null = API hiccup: skip without stamping so it retries next run.
    if (!serp) continue;
    const hit = domain ? serp.organic.find((c) => c.domain === domain) : undefined;
    await run(
      "UPDATE posts SET rank = ?, rank_checked_at = datetime('now') WHERE id = ?",
      [hit?.position ?? null, p.id],
    );
    checked++;
  }

  const unchecked =
    (await get<{ n: number }>(
      "SELECT COUNT(*) as n FROM posts WHERE status = 'published' AND keyword != '' AND rank_checked_at IS NULL",
    ))?.n ?? 0;

  return { live: true, domain, checked, unchecked };
}
