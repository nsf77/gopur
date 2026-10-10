# Gopur

Bun workspace monorepo for the Gopur PWA (`app/`) and Cloudflare Workers API (`api/`).

## Stage 2 (reads)

- Workspaces: `app`, `api`
- `api`: Hono on Workers, ArkType validators + `AppType` RPC, D1 schema for feed/event/search/organizer reads
- `app`: Solid 2 + Vite + Tailwind v4 + TanStack Query, healthz + feed via `hc`

Not ported yet: auth OTP, chat/WS, importer, full PWA screens, production deploy.

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

## Check

```bash
bun run typecheck
bun run --filter api build
bun run --filter app build
```

## Next stages

1. Port PWA screens onto this RPC client (no Orval/OpenAPI).
2. Auth, real D1 database id, and Workers deploy config.
