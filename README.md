# Gopur

Bun workspace monorepo for the Gopur PWA (`app/`) and Cloudflare Workers API (`api/`).

## Stage 3 (auth + writes)

- Workspaces: `app`, `api`
- `api`: Hono on Workers, ArkType, D1 (APAC `gopur`) + KV `GOPUR_AUTH`
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
