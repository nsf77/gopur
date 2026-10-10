# Gopur

Bun workspace monorepo for the Gopur PWA (`app/`) and Cloudflare Workers API (`api/`).

## Stage 1 (this scaffold)

- Workspaces: `app`, `api`
- `api`: Hono on Workers, typed `AppType` for RPC, `GET /healthz` → `{ ok: true }`, D1 binding + migrations stub
- `app`: Solid 2 + Vite + Tailwind v4 + TanStack Query, one smoke page that hits healthz through `hc` + Query

Not ported yet: domain API, D1 schema, full PWA screens from the previous Solid app.

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
bun test
bun run typecheck
bun run --filter api build
bun run --filter app build
```

## Next stages

1. D1 schema + Hono routes (rewrite of the previous Elysia API, not a clone).
2. Port PWA screens onto this RPC client (no Orval/OpenAPI).
3. Auth, real D1 database id, and Workers deploy config.
