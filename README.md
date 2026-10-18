# Gopur

Bun workspace monorepo: TanStack Start UI (`app/`) and Hono API library (`api/`) on **one Cloudflare Worker**.

## Surfaces

- Workspaces: `app`, `api`
- `api`: Hono (ArkType, D1 HKG `gopur` + KV `GOPUR_AUTH` + Durable Object `CHAT_HUB`). Mounted at `/api` on the Start Worker.
- `app`: React 19 + TanStack Start (React Compiler) — Home feed (`/`), Explore (`/explore`), Event detail (`/event/:id` with like/save/share), email OTP login, WhatsApp-style chat (`/chat`, `/chat/:id`), my-events + host editor (`/my-events`, `/event/new`, `/event/:id/edit`), notifications, settings, and profile. Hono RPC (`hc` + `AppType`) + TanStack Query; Valibot parses client payloads. Zustand session. Paraglide JS `en` + `zh-Hant`.
- UI: `@cloudflare/kumo` (granular component imports; primitives for OTP/avatar), Tailwind v4 (`@source` Kumo dist + Gopur `#304385` on Kumo brand tokens), liquid-glass with Reduce Transparency as app chrome, Phosphor (`@phosphor-icons/react`) only — no Lucide.
- Lists: `GET /api/me/events`, `/api/me/saved`, `/api/me/likes`, `/api/users/:id/events`
- Notifications: D1 inbox + `GET /api/notifications`
- Host editor: `POST|PATCH /api/events`
- Importer: Wrangler cron `0 16 * * *` (00:00 HKT). Manual `POST /api/import/run` with `X-Import-Token`.
- Chat: store-and-forward relay over `/ws` (and `/api/ws`)

Not in this stage: production secrets rotation.

## Cloudflare Kumo vs deploy

[`@cloudflare/kumo`](https://www.npmjs.com/package/@cloudflare/kumo) is Cloudflare’s React **component library** (the UI stack). It is not the Worker deploy path. Icons are Phosphor (`@phosphor-icons/react`), which Kumo peers; Lucide is not used.

Deploy is **TanStack Start + `@cloudflare/vite-plugin`** (`app/wrangler.toml`, Worker `gopur-app`). `src/worker.ts` serves Hono at `/api` (and WebSocket upgrades at `/ws` + `/api/ws`), then delegates everything else to Start. Custom domain target: go.pur.run.

## Setup

Requires [Bun](https://bun.sh).

```bash
bun install
```

## Develop

```bash
# App + API on one Worker — http://localhost:3000
# RPC and `/api/*` are same-origin. Optional: VITE_API_URL to override.
bun run dev
```

Optional Worker vars/secrets: `JWT_SECRET`, `BREVO_API_KEY`, `ADMIN_EMAILS`, `EMAIL_FROM`, `IMPORT_TOKEN`.

## Check

```bash
bun run typecheck
bun run build
```

## Cloudflare Workers (Git deploy)

Single Worker: `gopur-app` (account from `app/wrangler.toml`). Point **go.pur.run** at this Worker for both UI and `/api`. After cutover, stop sending `/api*` to `gopur-api`.

`CHAT_HUB` is bound on `gopur-app`. If chat previously used the Durable Object on `gopur-api`, this is a new DO namespace on the Start Worker.

### Dashboard Builds settings (after connecting the `nsf77/gopur` repo)

**gopur-app** (production branch `main`)

- Root directory: `app`
- Build command: `cd .. && bun install && bun run --filter app build`
- Deploy command: `npx wrangler deploy`
- Path includes: `app/**`, `api/**` (Hono is bundled into this Worker)

D1 `gopur` (HKG) and KV `GOPUR_AUTH` are bound in `app/wrangler.toml` (schema in `api/migrations`). Set Worker secrets: `JWT_SECRET`, `IMPORT_TOKEN`, optional `BREVO_API_KEY`, `EMAIL_FROM`, `ADMIN_EMAILS`.
