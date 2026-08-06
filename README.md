# HomeSmart.ca

Programmatic SEO/GEO blog platform for construction and home-building innovations.
Live RSS feeds → DeepSeek JTBD analysis → 6×6×6 morphological matrix → headless
WordPress → ultra-fast Astro frontend with user accounts and saved blueprints.

## Stack

| Layer | Tech |
|---|---|
| Frontend | Astro 5 (SSR, Node adapter) + Tailwind CSS 4 + React islands |
| Content | Headless WordPress (`jtbd_posts` CPT, REST meta fields, ACF-compatible) |
| App data | PostgreSQL (users, sessions, magic links, bookmarks, leads) |
| AI engine | DeepSeek `deepseek-v4-flash`, strict JSON mode, banned-word enforcement |
| Ingestion | `rss-parser` worker on a configurable loop |
| Deploy | Docker Compose → Dokploy |

## How the pipeline works

1. `backend/rss-processor.ts` pulls construction/architecture RSS feeds.
2. Each fresh item goes to DeepSeek with a system prompt that:
   - extracts the Job-To-Be-Done (pre/post-conditions, tools, action → object → outcome);
   - maps it to one node of the 216-cell morphological matrix
     (Interrogative × Relational × Scale);
   - writes a 400–700 word article in enforced field-notes voice.
3. Output is validated: JSON shape, matrix values, and a banned-word scan
   (delve, tapestry, game-changer, seamless, robust, …). Violations trigger one
   corrective retry with the exact offending words fed back.
4. The post publishes to WordPress via REST with all matrix/condition meta.
5. Astro renders `/jtbd/[slug]` with `HowTo` + `Article` JSON-LD, the blueprint
   card, save button, and lead-capture form. Public pages send
   `stale-while-revalidate` cache headers for ISR-like behaviour behind a CDN.

## Local development

```bash
cp .env.example .env          # fill in at least DATABASE_URL
npm install
npm run db:init               # applies db/schema.sql to Postgres
npm run dev                   # http://localhost:4321
```

No WordPress yet? The site falls back to bundled sample posts so every page
renders. No SMTP? Magic links and digests print to the server console.

Run the ingestion pipeline once:

```bash
npm run rss:process           # needs DEEPSEEK_API_KEY, WP_URL, WP_AUTH_KEY
```

## WordPress setup (headless CMS)

1. Any WordPress 6.x install works (the compose file ships one).
2. Copy `wordpress/mu-plugins/homesmart-jtbd.php` into `wp-content/mu-plugins/`
   (the compose file mounts it automatically). This registers the `jtbd_posts`
   post type and exposes every matrix/condition/lead field over REST — no ACF
   required, but ACF Pro field groups with the same keys work too.
3. Create a bot user (Editor role) → Profile → **Application Passwords** →
   set `WP_AUTH_KEY="botuser:app password"` in `.env`.

## Deploying on Dokploy

1. **Create service** → *Compose* → point it at this repo/branch
   (`docker-compose.yml` at the root).
2. **Environment tab** → paste your filled-in `.env.example` values
   (at minimum `DEEPSEEK_API_KEY`, `WP_AUTH_KEY`, `POSTGRES_PASSWORD`,
   `WP_DB_PASSWORD`, `SITE_URL`).
3. **Domains tab** →
   - `homesmart.ca` → service `web`, port `4321`
   - `cms.homesmart.ca` → service `wordpress`, port `80`
4. Deploy. Postgres applies `db/schema.sql` on first boot; WordPress walks you
   through its 5-minute install at the CMS domain; then set `WP_URL` to the CMS
   domain and redeploy so the frontend and RSS worker read from it.

## Key routes

| Route | What it does |
|---|---|
| `/` | Innovation feed with instant search + interrogative filters |
| `/jtbd/[slug]` | Blueprint page: matrix badge, conditions, JSON-LD, save button, lead form |
| `/dashboard/saved` | Protected: saved blueprints, filtering, email digest toggle |
| `/login`, `/signup` | Email/password + magic-link auth |
| `POST /api/bookmarks` | Toggle a save (optimistic UI on the client) |
| `POST /api/leads` | Consultation requests → `leads` table + optional email notify |

## Project layout

```
backend/rss-processor.ts      RSS → DeepSeek → WordPress pipeline
backend/rss-loop.ts           Long-running worker wrapper
backend/db-init.ts            Applies db/schema.sql
db/schema.sql                 Postgres schema (idempotent)
wordpress/mu-plugins/         jtbd_posts CPT + REST meta registration
src/lib/wp.ts                 WP REST client + sample-data fallback
src/lib/auth-bookmarks.ts     Auth, sessions, magic links, bookmarks, prefs
src/lib/db.ts                 pg pool
src/lib/mailer.ts             SMTP (console fallback in dev)
src/components/               Header, Footer, SaveInnovationButton (React),
                              MorphologicalBadge, BlueprintCard, LeadCaptureForm
src/pages/                    index, jtbd/[slug], dashboard/saved, login,
                              signup, api/*
```
