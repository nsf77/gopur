# Gopur agent notes

Bun workspace monorepo. Workspaces: `app` (React SPA) and `api` (Hono on Cloudflare Workers).

## Package manager

- **Bun only.** Do not use npm, pnpm, or yarn to install or run scripts.
- Root `workspaces` is `["app", "api"]`. Run `bun install` at the repo root.

## API (`api/`)

- Hono on Cloudflare Workers via Wrangler.
- Export a typed Hono app (`AppType`) so the SPA can call it with `hc` from `hono/client`.
- Validate request query/params/json with **ArkType** (`arktype` + `@hono/arktype-validator`). Shared response types are ArkType schemas. Do not add Zod or TypeBox on the API.
- Use `@mobily/ts-belt` (`pipe` / `O` / `R` / `A`) for optional values and expected failures. `noUncheckedIndexedAccess` is on.
- Persistence is **D1** (`env.DB`) plus **KV** (`env.GOPUR_AUTH`) for OTP and session keys. Do not reintroduce Fly.io, `bun:sqlite`, or a local SQLite driver.
- Read routes: `GET /healthz`, `/feed`, `/events`, `/events/:id`, `/events/:id/likers`, `/search/events`, `/organizers`, `/organizers/:key`.
- Auth: `POST /auth/email/start`, `POST /auth/email/verify`, `GET|PATCH /me` (JWT + KV OTP). Email via Brevo when `BREVO_API_KEY` is set; otherwise stub.
- Writes: `POST|PATCH /events`, like/save/share, follow, `GET /users/:id`.
- Lists / notifications: `/me/events|saved|likes`, `/notifications`.
- Importer: Wrangler cron + `POST /import/run` (`IMPORT_TOKEN`).
- Chat: Durable Object `CHAT_HUB`, store-and-forward relay, `/ws` (and `/api/ws`). Production deploy is a later stage.

## App (`app/`)

- React 19 + Vite + React Compiler. Do **not** add `useMemo` / `useCallback` for memoization — rely on the compiler.
- TanStack Router, TanStack Query, nuqs, Zustand.
- Call the API **only** through the Hono RPC client typed from `api`'s `AppType` (`hc`). Validate RPC JSON with **Valibot** on the client. Do not depend on `arktype` in the app.
- Use `@mobily/ts-belt` in query `select` / mappers and helpers.
- i18n: Paraglide JS (`@inlang/paraglide-js`), locales `en` and `zh-Hant`.
- UI: `@base-ui/react` for dialog / tabs / switch / OTP patterns; `class-variance-authority` (`cva`) for Tailwind class variants. Do not add Ark UI or Kobalte.
- Lucide via `lucide-react` only. Do not import `lucide-solid` or unplugin-icons Solid compilers.

## Brand / deploy

- Accent color: `#304385` (Tailwind v4 `@theme`, e.g. `--color-accent`).
- Tailwind v4 + Apple liquid-glass with Reduce Transparency (`.glass-surface`).
- App Worker: Vite build → Wrangler static assets (`app/wrangler.toml`, `not_found_handling = "single-page-application"`) for go.pur.run. Keep this assets Worker path.
- `@cloudflare/kumo` exists as Cloudflare’s React component library (Base UI + Phosphor). It is **not** the SPA deploy toolchain. Official Vite+Workers SPA plugin is `@cloudflare/vite-plugin`; this repo keeps the existing `assets.directory` + `src/worker.ts` deploy so dashboard Builds stay the same.

## Checks

- Typecheck and build only (`bun run typecheck`, `bun run --filter api build`, `bun run --filter app build`).
- No Vitest / `bun test` suites unless a later stage asks. No GitHub Actions unless a later stage asks.
