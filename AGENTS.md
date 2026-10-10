# Gopur agent notes

Bun workspace monorepo. Workspaces: `app` (Solid PWA) and `api` (Hono on Cloudflare Workers).

## Package manager

- **Bun only.** Do not use npm, pnpm, or yarn to install or run scripts.
- Root `workspaces` is `["app", "api"]`. Run `bun install` at the repo root.

## API (`api/`)

- Hono on Cloudflare Workers via Wrangler.
- Export a typed Hono app (`AppType`) so the PWA can call it with `hc` from `hono/client`.
- Persistence is **D1** (`env.DB`). Do not reintroduce Fly.io, `bun:sqlite`, or a local SQLite driver.
- Validate request query/params with **ArkType** (`arktype` + `@hono/arktype-validator`). Shared response types are ArkType schemas. Do not add Zod or TypeBox.
- Use `@mobily/ts-belt` (`pipe` / `O` / `R` / `A`) for optional values and expected failures. `noUncheckedIndexedAccess` is on.
- Read routes: `GET /healthz`, `/feed`, `/events`, `/events/:id`, `/events/:id/likers`, `/search/events`, `/organizers`, `/organizers/:key`.
- Auth OTP, chat/WS, importer, and production deploy are later stages.

## App (`app/`)

- Solid 2 + Vite + Tailwind v4 + TanStack Query.
- Call the API **only** through the Hono RPC client typed from `api`'s `AppType`.
- No Orval, no OpenAPI client generation.
- Use ArkType-inferred types from `api` (do not introduce Zod/TypeBox). Use ts-belt in query `select` / mappers.

## Brand / PWA

- Accent color: `#304385` (Tailwind v4 `@theme`, e.g. `--color-accent`).
- Lucide icons **only** via `~icons/lucide/*` (unplugin-icons, Solid compiler). Do not import `lucide-solid` or `@lucide/solid`.
- Keep `@kobalte/tailwindcss` wired (`@plugin` in the CSS entry).
- Later PWA stages should preserve this brand surface (theme token, Lucide via unplugin-icons).
- **Later UI:** `@ark-ui/solid@6.0.0-next.0` + Tailwind v4 + Apple liquid-glass with Reduce Transparency. No UI rewrite in the API-read stage.

## Checks

- Typecheck and build only (`bun run typecheck`, `bun run --filter api build`, `bun run --filter app build`).
- No Vitest / `bun test` suites unless a later stage asks. No GitHub Actions unless a later stage asks.
