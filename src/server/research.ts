/**
 * Research — the keyword & competitor discovery seam. Same role as
 * wordpress.ts / queue.ts: a thin boundary over a platform primitive.
 *
 * ── DATA comes from the Clawnify-connected SerpAPI integration ──
 * When the org connects SerpAPI in Clawnify → Integrations, the builder injects
 * the CREDENTIALS broker binding + CLAWNIFY_ORG_ID (because clawnify.json lists
 * `credentials: ["serpapi"]`). We then pull LIVE Google SERP data through the
 * one SDK call the platform sanctions — `connect("serpapi", env).run(...)` — so
 * this app never touches an API key or Composio directly. `SERPAPI_SEARCH`
 * returns the real page-1 organic results (competitors), `related_searches`,
 * and People-Also-Ask questions (ranking opportunities + content gaps).
 *
 * SerpAPI has no descriptor in @clawnify/integrations, so `connect()` yields a
 * GenericClient (token()/run()) — which is all we need. Note: isConnected()
 * returns false for undescribed services, so readiness is gated via describe()
 * with an explicit `requires` entry instead.
 *
 * ── Graceful degradation ──
 * With no SerpAPI connection (e.g. local `pnpm dev`, or an org that hasn't
 * connected it), keyword discovery falls back to an AI-estimated expansion
 * (source:"ai") so the stage is never a dead end — clearly labelled, never
 * presenting invented numbers as live data. Competitor SERP analysis is
 * live-only: no model can know who currently ranks.
 *
 * DataForSEO's real search-volume/difficulty numbers are the natural next
 * enrichment, but its Composio surface is async task/poll — deferred to keep
 * this synchronous and simple. // shortcut: SerpAPI signals only; add
 * DataForSEO volume via a task/poll job when hard metrics are needed.
 */

import { connect, describe, type ConnectionsEnv } from "@clawnify/connections";
import { researchKeywords, type KeywordIdea } from "./ai";

export type ResearchSource = "live" | "ai";

export interface KeywordDiscovery {
  source: ResearchSource;
  ideas: KeywordIdea[];
}

export interface Competitor {
  position: number;
  domain: string;
  title: string;
  url: string;
}

export type CompetitorResult =
  | { live: true; seed: string; competitors: Competitor[]; gaps: string[] }
  | { live: false };

/** Whether live search data (SerpAPI) is available for this org right now. */
export async function researchConnected(env: ConnectionsEnv): Promise<boolean> {
  try {
    const [entry] = await describe(env, undefined, [{ service: "serpapi", as: "integration" }]);
    return !!entry?.connected;
  } catch {
    return false;
  }
}

/**
 * Seed topic → prioritized keyword ideas. Live SerpAPI signals when connected
 * (source:"live"), AI-estimated otherwise (source:"ai").
 */
export async function discoverKeywords(
  env: ConnectionsEnv,
  input: { seed: string; audience?: string },
): Promise<KeywordDiscovery> {
  const serp = await serpSearch(env, input.seed);
  const ideas = await researchKeywords(env, {
    seed: input.seed,
    audience: input.audience,
    relatedTerms: serp?.relatedTerms,
    rankingDomains: serp?.rankingDomains,
  });
  return { source: serp ? "live" : "ai", ideas };
}

/**
 * Seed keyword → who currently ranks (live organic results) + content gaps
 * (related searches / People-Also-Ask). Live-only — returns { live: false }
 * when SerpAPI isn't connected.
 */
export async function researchCompetitors(
  env: ConnectionsEnv,
  input: { seed: string },
): Promise<CompetitorResult> {
  const serp = await serpSearch(env, input.seed);
  if (!serp || !serp.organic.length) return { live: false };
  return { live: true, seed: input.seed, competitors: serp.organic, gaps: serp.relatedTerms.slice(0, 12) };
}

// ── SerpAPI live pull (via the Clawnify connections broker) ──────────

export interface SerpResult {
  organic: Competitor[];
  relatedTerms: string[];
  rankingDomains: string[];
}

/**
 * Run one live Google search through the connected SerpAPI integration.
 * Returns null on any failure (not connected, no broker, API error) so callers
 * degrade to the AI tier instead of surfacing an error. Shared with Measure
 * (rank tracking) so there is one SerpAPI call site.
 */
export async function serpSearch(env: ConnectionsEnv, query: string): Promise<SerpResult | null> {
  try {
    const data = await connect("serpapi", env).run("SERPAPI_SEARCH", { query });
    const obj = coerce(data);

    const organic: Competitor[] = findArray(obj, "organic_results")
      .slice(0, 10)
      .map((r: any, i: number) => {
        const url = str(r?.link) || str(r?.displayed_link);
        return { position: num(r?.position) ?? i + 1, title: str(r?.title), url, domain: domainOf(url) };
      })
      .filter((c: Competitor) => c.domain);

    const relatedTerms = [
      ...findArray(obj, "related_searches").map((r: any) => str(r?.query)),
      ...findArray(obj, "related_questions").map((r: any) => str(r?.question)),
    ]
      .map((t) => t.trim())
      .filter((t, i, a) => t && a.indexOf(t) === i);

    if (!organic.length && !relatedTerms.length) return null;
    const rankingDomains = [...new Set(organic.map((c) => c.domain))];
    return { organic, relatedTerms, rankingDomains };
  } catch {
    return null;
  }
}

// ── Defensive shaping of the brokered response ──────────────────────
// Composio may return the tool payload as an object OR a JSON string, and the
// SerpAPI JSON may be nested under a wrapper key — so parse tolerantly and
// search for known result arrays by name rather than a fixed path.

function coerce(v: unknown): any {
  if (typeof v === "string") {
    try { return JSON.parse(v); } catch { return {}; }
  }
  return v && typeof v === "object" ? v : {};
}

/** First non-empty array found under `key`, searching nested objects (bounded). */
function findArray(obj: any, key: string, depth = 4): any[] {
  if (!obj || typeof obj !== "object" || depth < 0) return [];
  if (Array.isArray(obj[key])) return obj[key];
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (v && typeof v === "object") {
      const found = findArray(v, key, depth - 1);
      if (found.length) return found;
    }
  }
  return [];
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

export function domainOf(url: string): string {
  if (!url) return "";
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] || "";
  }
}
