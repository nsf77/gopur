# Gopur

Bun workspace monorepo for the Gopur SPA (`app/`) and Cloudflare Workers API (`api/`).

## Surfaces

- Workspaces: `app`, `api`
- `api`: Hono on Workers, ArkType, D1 (HKG `gopur`) + KV `GOPUR_AUTH` + Durable Object `CHAT_HUB`
- `app`: React 19 SPA (React Compiler) — Home feed (`/`, infinite scroll), Explore (`/explore`, nuqs search/filters), Event detail (`/event/:id` with like/save/share). Other routes (`/login`, `/chat`, `/my-events`, `/settings`, `/notifications`, `/profile`) remain scaffold. Hono RPC (`hc` + `AppType`) + TanStack Query; Valibot parses client payloads. Zustand session. Paraglide JS `en` + `zh-Hant`.
- UI: `@base-ui/react` (behavior) + `class-variance-authority` (class variants), Tailwind v4, liquid-glass with Reduce Transparency, accent `#304385`, Lucide (`lucide-react`)
- Lists: `GET /me/events`, `/me/saved`, `/me/likes`, `/users/:id/events` (API; UI later)
- Notifications: D1 inbox + `GET /notifications` (API; UI later)
- Host editor: `POST|PATCH /events` (API; UI later)
- Importer: Wrangler cron `0 16 * * *` (00:00 HKT). Manual `POST /import/run` with `X-Import-Token`.
- Chat: store-and-forward relay over `/ws` (and `/api/ws`) (API; UI later)

Not in this stage: production secrets rotation.

## Cloudflare Kumo vs deploy

[`@cloudflare/kumo`](https://www.npmjs.com/package/@cloudflare/kumo) is Cloudflare’s React **component library**, not the Worker/assets deploy path. Gopur’s SPA uses Base UI + Lucide instead of Kumo/Phosphor.

Deploy stays **Vite build + Wrangler Workers assets** (`app/wrangler.toml`: `assets.directory = "./dist"`, `not_found_handling = "single-page-application"`, `src/worker.ts` ASSETS fetch) so go.pur.run / `gopur-app` dashboard Builds keep working. The current Cloudflare Vite SPA convention is `@cloudflare/vite-plugin`; it is not wired yet so the existing `assets.directory` snapshot deploy is unchanged.

## Setup

Requires [Bun](https://bun.sh).

```bash
bun install
```

## Develop

```bash
# API — http://localhost:8787
bun run dev:api

# SPA — http://localhost:3000 (set VITE_API_URL if the API is not on :8787)
bun run dev:app
```

Optional Worker vars: `JWT_SECRET`, `BREVO_API_KEY`, `ADMIN_EMAILS`, `EMAIL_FROM`, `IMPORT_TOKEN`.

## Check

```bash
bun run typecheck
bun run --filter api build
bun run --filter app build
```

## Cloudflare Workers (Git deploy)

Workers already created: `gopur-api`, `gopur-app` (account `[REDACTED]`).

| Worker | URL |
|--------|-----|
| gopur-api | https://gopur-api.nsfxd.workers.dev |
| gopur-app | https://gopur-app.nsfxd.workers.dev |

### Dashboard Builds settings (after connecting the `nsf77/gopur` repo)

**gopur-api** (production branch `main`)

- Root directory: `api`
- Build command: `cd .. && bun install`
- Deploy command: `npx wrangler deploy`
- Non-production deploy (optional): `npx wrangler versions upload`
- Path includes: `api/**`

**gopur-app** (production branch `main`)

- Root directory: `app`
- Build command: `cd .. && bun install && VITE_API_URL=https://go.pur.run/api bun run build`
- Deploy command: `npx wrangler deploy`
- Path includes: `app/**`
- Build env: `VITE_API_URL=https://go.pur.run/api`

D1 `gopur` (HKG) and KV `GOPUR_AUTH` are already bound in `api/wrangler.toml`. Set Worker secrets: `JWT_SECRET`, `IMPORT_TOKEN`, optional `BREVO_API_KEY`, `EMAIL_FROM`, `ADMIN_EMAILS`.
