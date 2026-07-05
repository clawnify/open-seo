/**
 * Produce — AI article authoring. A target keyword (+ optional plan context)
 * → a structured SEO article ({ title, meta_description, content_html }). Uses
 * OpenRouter with the org's injected OPENROUTER_API_KEY (the platform standard);
 * the model is overridable via SEO_MODEL.
 *
 * The body is generated as clean semantic HTML because WordPress's REST API
 * takes an HTML `content` field — no Markdown→HTML step, and it renders in the
 * dashboard preview as-is.
 */

const DEFAULT_MODEL = "anthropic/claude-sonnet-4";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export interface PlanContext {
  name?: string;
  keyword?: string;
  audience?: string;
  notes?: string;
}

export interface ArticleInput {
  /** Primary target keyword for the article. */
  keyword: string;
  /** Optional working title to steer the angle. */
  title?: string;
  /** Optional plan/cluster context for tone + intent. */
  plan?: PlanContext | null;
}

export interface Article {
  title: string;
  meta_description: string;
  content_html: string;
}

const ARTICLE_SYSTEM = `You are an expert SEO content writer producing people-first, helpful articles that rank in Google and get cited by AI answer engines (ChatGPT, Google AI Overviews).

Output rules:
- Respond with ONLY a JSON object, no prose around it, no code fences.
- Shape: { "title": string, "meta_description": string, "content_html": string }
- "title": a compelling, click-worthy H1 (<= 65 chars) that includes the target keyword naturally. No trailing period.
- "meta_description": a search-snippet summary (<= 155 chars) that includes the keyword and a clear value proposition.
- "content_html": the article BODY as clean semantic HTML. Use <h2>/<h3> section headings, <p> paragraphs, <ul>/<ol> lists, <strong> for emphasis, and <blockquote> sparingly. Do NOT include an <h1> (WordPress renders the title as the H1). Do NOT include <html>, <head>, or <body> wrappers, inline styles, or scripts.
- Structure for search intent: open with a direct answer to the query, then cover subtopics with descriptive headings, and close with a short FAQ (<h2>FAQ</h2> + <h3> questions). Aim for 700-1100 words unless told otherwise.
- Write naturally for humans; weave the keyword and related entities in without stuffing.`;

export async function generateArticle(env: Record<string, string | undefined>, input: ArticleInput): Promise<Article> {
  const parts: string[] = [];
  if (input.plan?.name) parts.push(`Content cluster: ${input.plan.name}`);
  if (input.plan?.audience) parts.push(`Target audience: ${input.plan.audience}`);
  if (input.plan?.notes) parts.push(`Editorial notes: ${input.plan.notes}`);
  if (input.title) parts.push(`Suggested title/angle: ${input.title}`);
  parts.push(`Target keyword: ${input.keyword}`);
  parts.push("Write the article now.");

  const content = await complete(env, ARTICLE_SYSTEM, parts.join("\n"), { json: true });
  const parsed = parseJson(content) as Partial<Article>;
  return {
    title: (parsed.title || input.title || input.keyword).trim(),
    meta_description: (parsed.meta_description || "").trim(),
    content_html: (parsed.content_html || "").trim(),
  };
}

const IDEAS_SYSTEM = `You are an SEO strategist. Given a topic cluster and target audience, propose specific, search-intent-driven article titles that together build topical authority (mix of how-to, listicle, comparison, and real audience questions).

Output rules:
- Respond with ONLY a JSON object, no prose, no code fences.
- Shape: { "titles": string[] }
- Each title: <= 70 chars, specific, no numbering prefix, no trailing period.`;

/** Expand a cluster/keyword into a set of article title ideas (Produce → Ideas). */
export async function generateIdeas(
  env: Record<string, string | undefined>,
  input: { topic: string; audience?: string; count?: number },
): Promise<string[]> {
  const count = Math.min(Math.max(input.count ?? 8, 1), 20);
  const user = [
    `Topic cluster: ${input.topic}`,
    input.audience ? `Target audience: ${input.audience}` : "",
    `Propose ${count} article title ideas.`,
  ]
    .filter(Boolean)
    .join("\n");
  const content = await complete(env, IDEAS_SYSTEM, user, { json: true });
  const parsed = parseJson(content) as { titles?: unknown };
  const titles = Array.isArray(parsed.titles) ? parsed.titles : [];
  return titles.filter((t): t is string => typeof t === "string" && t.trim().length > 0).map((t) => t.trim()).slice(0, count);
}

// ── OpenRouter transport ─────────────────────────────────────────────

async function complete(
  env: Record<string, string | undefined>,
  system: string,
  user: string,
  opts: { json?: boolean } = {},
): Promise<string> {
  const apiKey = env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("AI generation unavailable: OPENROUTER_API_KEY is not set.");
  const model = env.SEO_MODEL || DEFAULT_MODEL;

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://clawnify.com",
      "X-Title": "Open SEO",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      ...(opts.json ? { response_format: { type: "json_object" } } : {}),
      temperature: 0.7,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenRouter error ${res.status}: ${text.slice(0, 300)}`);
  }
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("OpenRouter returned no content.");
  return content;
}

/** Tolerant JSON extraction — strips code fences / surrounding prose. */
function parseJson(content: string): Record<string, unknown> {
  const cleaned = content.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const a = cleaned.indexOf("{");
    const b = cleaned.lastIndexOf("}");
    if (a >= 0 && b > a) {
      try {
        return JSON.parse(cleaned.slice(a, b + 1));
      } catch {
        /* fall through */
      }
    }
    return {};
  }
}
