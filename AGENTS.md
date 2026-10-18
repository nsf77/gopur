# Gopur agent notes

Bun workspace monorepo. Workspaces: `app` (TanStack Start on Cloudflare Workers) and `api` (Hono library: ArkType, D1/KV/DO).

## Package manager

- **Bun only.** Do not use npm, pnpm, or yarn to install or run scripts.
- Root `workspaces` is `["app", "api"]`. Run `bun install` at the repo root.

## API (`api/`)

- Hono app (`AppType`) consumed by the SPA via `hc` from `hono/client`. Mounted on the Start Worker at `/api`.
- Validate request query/params/json with **ArkType** (`arktype` + `@hono/arktype-validator`). Shared response types are ArkType schemas. Do not add Zod or TypeBox on the API.
- Use `@mobily/ts-belt` (`pipe` / `O` / `R` / `A`) for optional values and expected failures. `noUncheckedIndexedAccess` is on.
- Persistence is **D1** (`env.DB`) plus **KV** (`env.GOPUR_AUTH`) for OTP and session keys. Do not reintroduce Fly.io, `bun:sqlite`, or a local SQLite driver.
- Read routes: `GET /healthz`, `/feed`, `/events`, `/events/:id`, `/events/:id/likers`, `/search/events`, `/organizers`, `/organizers/:key` (all under `/api` on the combined Worker).
- Auth: `POST /auth/email/start`, `POST /auth/email/verify`, `GET|PATCH /me` (JWT + KV OTP). Email via Brevo when `BREVO_API_KEY` is set; otherwise stub.
- Writes: `POST|PATCH /events`, like/save/share, follow, `GET /users/:id`.
- Lists / notifications: `/me/events|saved|likes`, `/notifications`.
- Importer: Wrangler cron on the Start Worker + `POST /api/import/run` (`IMPORT_TOKEN`).
- Chat: Durable Object `CHAT_HUB`, store-and-forward relay, `/ws` and `/api/ws`. Production deploy is a later stage.

## App (`app/`)

- **TanStack Start** on one Cloudflare Worker (SSR document + client routes; `ssr: false` on the root route because session/theme live in `localStorage`).
- React 19 + Vite + React Compiler. Do **not** add `useMemo` / `useCallback` for memoization — rely on the compiler.
- TanStack Router (Start file routes), TanStack Query, nuqs, Zustand.
- Call the API **only** through the Hono RPC client typed from `api`'s `AppType` (`hc`). Default base is same-origin `/api`. Validate RPC JSON with **Valibot** on the client. Do not depend on `arktype` in the app.
- Use `@mobily/ts-belt` in query `select` / mappers and helpers.
- i18n: Paraglide JS (`@inlang/paraglide-js`), locales `en` and `zh-Hant`.
- UI: `@cloudflare/kumo` (granular `@cloudflare/kumo/components/...`; primitives only when Kumo has no styled equivalent, e.g. OTP). Tailwind v4 `@source` for Kumo dist. Do not add Ark UI, Kobalte, `@base-ui/react`, or `class-variance-authority` in app code.
- Icons: Phosphor (`@phosphor-icons/react`) everywhere the SPA renders UI. Do not add Lucide.

## Brand / deploy

- Accent color: `#304385` (Tailwind v4 `@theme`, e.g. `--color-accent`).
- Tailwind v4 + Apple liquid-glass with Reduce Transparency (`.glass-surface`).
- Single Worker: `app/wrangler.toml` (`gopur-app`) — `@cloudflare/vite-plugin` + custom `src/worker.ts` (Hono `/api` + `/ws`, then Start). Domain target: go.pur.run.
- SPA UI is `@cloudflare/kumo` (Cloudflare’s React component library: Base UI + Phosphor). That is **not** the Worker deploy toolchain.

## Checks

- Typecheck and build only (`bun run typecheck`, `bun run build`).
- No Vitest / `bun test` suites unless a later stage asks. No GitHub Actions unless a later stage asks.
