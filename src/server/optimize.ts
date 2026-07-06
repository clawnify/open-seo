/**
 * Optimize — data-driven rewrite suggestions for an existing article. Pulls the
 * live SERP for the article's keyword (the same SerpAPI seam Research/Measure
 * use) so the LLM proposes improvements grounded in what actually ranks and
 * what searchers ask, not guesses. Each suggestion is deterministically
 * applicable (replace the meta description, or append a missing section) — the
 * client applies accepted ones via the normal post update, so "accept/reject"
 * is real, not advisory. Degrades to AI-only suggestions when SerpAPI isn't
 * connected (source:"ai").
 */

import { get } from "./db";
import type { ConnectionsEnv } from "@clawnify/connections";
import { serpSearch } from "./research";
import { suggestOptimizations, type OptimizeSuggestion } from "./ai";

export type { OptimizeSuggestion };
export type OptimizeSource = "live" | "ai";

export interface OptimizeResult {
  source: OptimizeSource;
  suggestions: OptimizeSuggestion[];
}

/** Propose apply-able SEO improvements for one article. */
export async function suggestImprovements(
  env: ConnectionsEnv,
  postId: number,
): Promise<OptimizeResult | null> {
  const post = await get<{ keyword: string; title: string; content_html: string; meta_description: string }>(
    "SELECT keyword, title, content_html, meta_description FROM posts WHERE id = ?",
    [postId],
  );
  if (!post) return null;
  if (!post.content_html?.trim()) return { source: "ai", suggestions: [] };

  // Ground in the live SERP for the article's keyword when possible.
  const serp = post.keyword ? await serpSearch(env, post.keyword) : null;

  const suggestions = await suggestOptimizations(env, {
    keyword: post.keyword,
    title: post.title,
    contentHtml: post.content_html,
    currentMeta: post.meta_description,
    relatedTerms: serp?.relatedTerms,
    competitorDomains: serp?.rankingDomains,
  });

  return { source: serp ? "live" : "ai", suggestions };
}
