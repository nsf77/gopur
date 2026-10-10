# Gopur

Bun workspace monorepo for the Gopur PWA (`app/`) and Cloudflare Workers API (`api/`).

## Surfaces

- Workspaces: `app`, `api`
- `api`: Hono on Workers, ArkType, D1 (HKG `gopur`) + KV `GOPUR_AUTH` + Durable Object `CHAT_HUB`
- `app`: Solid 2 PWA — feed, explore, event detail, email OTP, profile/settings, like/save, `/chat` via Hono RPC + TanStack Query. Forms use TanStack Form `onChange`/`onSubmit` functions (no ArkType/Zod/Valibot in the PWA).
- UI: `@kobalte/core` 2 alpha, Tailwind v4, liquid-glass with Reduce Transparency, accent `#304385`
- Lists: `GET /me/events`, `/me/saved`, `/me/likes`, `/users/:id/events`
- Notifications: D1 inbox + `GET /notifications`, unread-count, mark-read
- Host editor: `POST|PATCH /events` via `/event/new` and `/event/:id/edit`
- Importer: Wrangler cron `0 16 * * *` (00:00 HKT). Manual `POST /import/run` with `X-Import-Token`.
- Chat: store-and-forward relay (device IndexedDB history, ticks, 30-day TTL) over `/ws` (and `/api/ws`)

Not in this stage: production secrets rotation.

## Setup

Requires [Bun](https://bun.sh).

```bash
bun install
```

## Develop

```bash
# API — http://localhost:8787
bun run dev:api

# PWA — http://localhost:3000 (set VITE_API_URL if the API is not on :8787)
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
