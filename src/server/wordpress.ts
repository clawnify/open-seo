/**
 * WordPress publish adapter — the single seam over WordPress credentials + the
 * WP REST API. Same role as db.ts / queue.ts: a thin boundary over a platform
 * primitive, so the rest of the app never touches auth details.
 *
 * ── CREDENTIALS come from the Clawnify-connected WordPress integration ──
 * The user connects their SELF-HOSTED WordPress site in Clawnify → Integrations
 * (a localOnly BASIC_AUTH connection: site URL + username + Application
 * Password). Because clawnify.json declares `credentials: ["wordpress"]`, the
 * builder resolves that connected credential from the org vault post-build
 * (apps/api resolveApiKeyVars → getCredentialEnvMap("wordpress")) and injects
 * each field as a Worker secret:
 *   WORDPRESS_SITE_URL / WORDPRESS_USERNAME / WORDPRESS_PASSWORD
 * So these env vars ARE the connected integration — nothing is hardcoded; local
 * `.dev.vars` is just the dev stand-in for that same injection.
 *
 * Why not `@clawnify/connections` connect("wordpress")? There is no wordpress
 * descriptor, so connect() yields only token() (a single string — can't carry
 * the site_url+username+app_password triple) and run() (Composio execute → the
 * wordpress.com HOSTED target, wrong for a self-hosted site). For self-hosted
 * BASIC_AUTH, credentialEnv injection IS the platform's sanctioned delivery.
 * If a self-hosted-safe runtime accessor is ever added, swapping `resolveCreds`
 * is the ONLY change here — everything downstream is already REST-only.
 *
 * We still read those injected vars through the SDK's `secret()` (a plain env
 * read) rather than raw indexing — the sanctioned way to read injected
 * secrets, and it keeps the env type consistent with the rest of the app.
 */

import { secret, type ConnectionsEnv } from "@clawnify/connections";

export interface WordPressCreds {
  siteUrl: string; // e.g. https://myblog.com (no trailing slash)
  username: string;
  appPassword: string;
}

/** Resolve the org's self-hosted WordPress credentials (see file header). */
export function resolveCreds(env: ConnectionsEnv): WordPressCreds | null {
  const siteUrl = (secret("WORDPRESS_SITE_URL", env) || "").trim().replace(/\/+$/, "");
  const username = (secret("WORDPRESS_USERNAME", env) || "").trim();
  const appPassword = (secret("WORDPRESS_PASSWORD", env) || "").trim();
  if (!siteUrl || !username || !appPassword) return null;
  return { siteUrl, username, appPassword };
}

/** Whether a WordPress site is connected (creds present). */
export function wordpressConnected(env: ConnectionsEnv): boolean {
  return resolveCreds(env) !== null;
}

export interface PublishInput {
  title: string;
  contentHtml: string;
  excerpt?: string;
  slug?: string;
}

export interface PublishResult {
  ok: boolean;
  wpPostId?: number;
  url?: string;
  error?: string;
}

/**
 * Publish an article to the connected WordPress site, live immediately.
 *
 * Scheduling is owned by the Clawnify queue (see queue.ts) — this fires at the
 * scheduled moment — so we always publish with status "publish" rather than
 * relying on WordPress's own `future` scheduling.
 */
export async function publishArticle(
  env: ConnectionsEnv,
  input: PublishInput,
): Promise<PublishResult> {
  const creds = resolveCreds(env);
  if (!creds) {
    return { ok: false, error: "No WordPress site connected. Connect one in Clawnify → Integrations." };
  }

  const auth = btoa(`${creds.username}:${creds.appPassword}`);
  const body: Record<string, unknown> = {
    title: input.title,
    content: input.contentHtml,
    status: "publish",
  };
  if (input.excerpt) body.excerpt = input.excerpt;
  if (input.slug) body.slug = input.slug;

  try {
    const res = await fetch(`${creds.siteUrl}/wp-json/wp/v2/posts`, {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as {
      id?: number;
      link?: string;
      message?: string;
    };
    if (!res.ok) {
      return { ok: false, error: data.message || `WordPress responded ${res.status}` };
    }
    return { ok: true, wpPostId: data.id, url: data.link };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "WordPress request failed" };
  }
}
