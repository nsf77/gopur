# Gopur

Bun workspace monorepo for the Gopur PWA (`app/`) and Cloudflare Workers API (`api/`).

## Stage 3 (auth + writes)

- Workspaces: `app`, `api`
- `api`: Hono on Workers, ArkType, D1 (HKG `gopur`) + KV `GOPUR_AUTH`
- Auth: email OTP (KV) → JWT; Brevo when `BREVO_API_KEY` is set, otherwise stub
- Writes: create/update event, like/save/share, follow, profile patch
- `app`: healthz + feed + like/save via `hc`

Not in this stage: chat/WS, importer, full PWA, production secrets rotation.

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

Optional Worker vars: `JWT_SECRET`, `BREVO_API_KEY`, `ADMIN_EMAILS`, `EMAIL_FROM`.

## Check

```bash
bun run typecheck
bun run --filter api build
bun run --filter app build
```


## Cloudflare Workers (Git deploy)

Workers already created: `gopur-api`, `gopur-app` (account `f13e891dc4bb32f8c1450b76344ad1ca`).

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
- Build command: `cd .. && bun install && VITE_API_URL=https://gopur-api.nsfxd.workers.dev bun run build`
- Deploy command: `npx wrangler deploy`
- Path includes: `app/**`
- Build env: `VITE_API_URL=https://gopur-api.nsfxd.workers.dev`

D1 `gopur` (HKG) and KV `GOPUR_AUTH` are already bound in `api/wrangler.toml`. Set Worker secrets: `JWT_SECRET`, optional `BREVO_API_KEY`, `EMAIL_FROM`, `ADMIN_EMAILS`.

