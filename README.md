<img src="readme-banner.png" alt="Open SEO preview" />

# Open SEO: The Open-Source Surfer & Frase Alternative

[![Deploy with Clawnify](https://app.clawnify.com/deploy-button.svg)](https://app.clawnify.com/deploy?repo=clawnify/open-seo)

An AI SEO content engine for WordPress. Plan topical clusters, generate people-first articles, and auto-publish them to your site on a schedule. Built with **Preact + Tailwind CSS + Hono + D1**. Deploys to Cloudflare Workers via [Clawnify](https://clawnify.com).

Think of it as an open-source alternative to **Surfer** or **Frase** — a content pipeline you can self-host and customize, wired straight into your own WordPress.

## Features (Phase 1: Produce + Publish)

- **Content plans** — group articles into topical clusters (pillar topic + target keyword + audience) to build authority.
- **Idea generation** — expand a cluster into a set of search-intent article titles.
- **Article generation** — turn a target keyword into a full, people-first article (title, meta description, semantic HTML body) via OpenRouter.
- **Pipeline** — every article grouped by status: draft → scheduled → published → failed.
- **Calendar** — month grid of scheduled articles.
- **Auto-publish to WordPress** — schedule an article and the Clawnify queue fires it to your site's REST API at the chosen time; publish now with one click.
- **Dashboard** — at-a-glance pipeline stats and recent articles.

> **Roadmap (Phase 2):** Research (keyword/competitor discovery via DataForSEO / SerpAPI) and Measure/Optimize (rank tracking + AI rewrite suggestions).

## How publishing works

Scheduling is owned by the **Clawnify managed queue** (`services.clawnify.com/queue`): saving a scheduled article enqueues a deferred job that calls this app's own `/api/internal/publish` at the scheduled time (HMAC-verified). That handler publishes the article to your **self-hosted WordPress** via the REST API using an Application Password.

**Credentials come from the WordPress you connect in Clawnify → Integrations** — not from anything hardcoded. Because `clawnify.json` declares `credentials: ["wordpress"]`, the builder resolves that connected credential from your org's vault at deploy time and injects it into the app as `WORDPRESS_SITE_URL` / `WORDPRESS_USERNAME` / `WORDPRESS_PASSWORD` Worker secrets. All of it is read in one seam — `src/server/wordpress.ts`. Locally, `.dev.vars` is just the stand-in for that same injection.

## Quickstart

```bash
git clone https://github.com/clawnify/open-seo.git
cd open-seo
pnpm install
pnpm dev
```

Open `http://localhost:5173`. The D1 schema is applied automatically on startup.

For local generation + publishing, fill `.dev.vars`:

```
OPENROUTER_API_KEY=sk-or-...
WORDPRESS_SITE_URL=https://your-site.com
WORDPRESS_USERNAME=your-wp-user
WORDPRESS_PASSWORD=xxxx xxxx xxxx xxxx   # WordPress → Users → Application Passwords
```

In production (deployed via Clawnify), all of these are injected automatically from your connected integrations — no keys in the app.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Preact, TypeScript, Tailwind CSS v4, Vite |
| **Backend** | Hono (Cloudflare Worker) |
| **Database** | D1 (SQLite at the edge) |
| **Generation** | OpenRouter (`anthropic/claude-sonnet-4` by default, override via `SEO_MODEL`) |
| **Scheduling** | Clawnify managed queue |
| **Publishing** | WordPress REST API (Application Password) |
| **Icons** | Lucide |

Design follows the Clawnify Apps system — see `DESIGN.md`.

## Architecture

```
src/
  server/
    index.ts        -- Hono API: plans, posts, generate, publish, calendar, stats
    ai.ts           -- OpenRouter article + idea generation (Produce)
    wordpress.ts    -- WordPress publish seam (credentials + REST)
    queue.ts        -- Clawnify managed-queue scheduling adapter
    db.ts           -- D1 adapter (@clawnify/db)
    schema.sql      -- content_plans + posts
  client/
    app.tsx         -- Root component with router
    components/     -- sidebar, dashboard, pipeline, calendar, plans, composer
    hooks/          -- use-app (state + CRUD), use-router (pushState)
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/status` | WordPress + AI connection state |
| GET/POST/PUT/DELETE | `/api/plans[/:id]` | Content plan CRUD |
| POST | `/api/ideas` | Article title ideas for a cluster |
| POST | `/api/generate` | Generate a full article draft |
| GET/POST/PUT/DELETE | `/api/posts[/:id]` | Article CRUD |
| GET | `/api/posts/calendar?month=YYYY-MM` | Articles grouped by day |
| POST | `/api/posts/:id/publish` | Publish now to WordPress |
| POST | `/api/internal/publish` | Scheduled delivery (queue → HMAC-verified) |
| GET | `/api/stats` | Pipeline stats |

## Deploy

```bash
npx clawnify deploy
```

## License

MIT
