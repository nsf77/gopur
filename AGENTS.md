# Gopur agent notes

Bun workspace monorepo. Workspaces: `app` (Solid PWA) and `api` (Hono on Cloudflare Workers).

## Package manager

- **Bun only.** Do not use npm, pnpm, or yarn to install or run scripts.
- Root `workspaces` is `["app", "api"]`. Run `bun install` at the repo root.

## API (`api/`)

- Hono on Cloudflare Workers via Wrangler.
- Export a typed Hono app (`AppType`) so the PWA can call it with `hc` from `hono/client`.
- Persistence is **D1** (`env.DB`). Do not reintroduce Fly.io, `bun:sqlite`, or a local SQLite driver.
- Stage 1 ships `GET /healthz` → `{ ok: true }` and a migrations stub. Domain routes and schema come later.

## App (`app/`)

- Solid 2 + Vite + Tailwind v4 + TanStack Query.
- Call the API **only** through the Hono RPC client typed from `api`'s `AppType`.
- No Orval, no OpenAPI client generation.

## Brand / PWA

- Accent color: `#304385` (Tailwind v4 `@theme`, e.g. `--color-accent`).
- Lucide icons **only** via `~icons/lucide/*` (unplugin-icons, Solid compiler). Do not import `lucide-solid` or `@lucide/solid`.
- Keep `@kobalte/tailwindcss` wired (`@plugin` in the CSS entry).
- Later PWA stages should preserve this brand surface (theme token, Lucide via unplugin-icons).

## Tests

- Prefer `bun test` against real Hono `app.request` (or `hc` with that fetch) over mocks.
- No GitHub Actions in this repo unless a later stage asks for them.
