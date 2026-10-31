# Gopur agent notes

Bun + Turborepo monorepo. Layout matches Shopur: `apps/api`, `apps/mobile`, `packages/shared`.

## Package manager

- **Bun only.** Do not use npm, pnpm, or yarn to install or run scripts.
- Root `workspaces` is `["apps/*", "packages/*"]`. Run `bun install` at the repo root.
- Orchestrate with **Turborepo**: `bun run typecheck`, `bun run dev`, `bun run build`, `bun run deploy`.

## API (`apps/api`)

- Hono 4 on **one Cloudflare Worker** (`gopur-app`, `nodejs_compat`). Domain target: go.pur.run.
- Hono RPC (`AppType`) consumed by the Expo app via `hc` from `hono/client`. Mounted at `/api`.
- **Better Auth** Email OTP at `/api/auth/*` (`better-auth` + `@better-auth/expo` + Drizzle adapter on D1).
- Existing Gopur D1 tables stay (`users`, events, chat, importer). Better Auth uses singular `user` / `session` / `account` / `verification` (migration `0007_better_auth.sql`).
- Validate request query/params/json with **ArkType**. Do not add Zod or TypeBox on the API except where Better Auth requires it internally.
- Use `@mobily/ts-belt` (`pipe` / `O` / `R` / `A`). `noUncheckedIndexedAccess` is on.
- Persistence: **Drizzle + D1** for auth tables; existing Gopur SQL via `env.DB`. **KV** `GOPUR_AUTH` is Better Auth secondary storage (and legacy JWT session keys). **Durable Object** `CHAT_HUB` for chat relay.
- Do not reintroduce Fly.io, `bun:sqlite`, or a local SQLite driver.
- Read routes: `GET /healthz`, `/feed`, `/events`, `/events/:id`, `/events/:id/likers`, `/search/events`, `/organizers`, `/organizers/:key`.
- Auth RPC (thin wrappers over Better Auth): `POST /auth/email/start`, `POST /auth/email/verify`, `GET|PATCH /me`.
- Writes: `POST|PATCH /events`, like/save/share, follow, `GET /users/:id`.
- Lists / notifications: `/me/events|saved|likes`, `/notifications`.
- Importer: Wrangler cron + `POST /api/import/run` (`IMPORT_TOKEN`).
- Chat: Durable Object `CHAT_HUB`, store-and-forward relay, `/ws` and `/api/ws`.

## Mobile (`apps/mobile`)

- **Expo SDK 58** + Expo Router. Android-first. No iOS / TestFlight / Apple Developer path.
- TanStack Query + `hc<AppType>` Hono RPC. Default API base is same-origin `/api` on web; native uses `EXPO_PUBLIC_API_URL` (see caveat below).
- Client payload parsing: **Valibot** in `@gopur/shared`. Do not depend on `arktype` in the app.
- i18n: Paraglide JS, locales `zh-Hant` (base) and `en`.
- UI: NativeWind 5 (RC) + Gluestack-compatible provider. Phosphor (`phosphor-react-native`). Accent `#304385`.
- Auth: Better Auth Email OTP + `@better-auth/expo` + SecureStore (web falls back to localStorage). Session token is also sent as `Authorization: Bearer` for Hono RPC.
- Expo web static export is copied into `apps/api/public` so the Worker serves UI + `/api/*`.

## Shared (`packages/shared`)

- Event text, drafts, profile form, access helpers, Valibot response schemas.
- Vitest covers shared/API business logic only. No frontend unit-test sprawl.

## Commands

```bash
bun install
bun run typecheck
bun run test          # api + shared Vitest
bun run dev           # wrangler + expo
bun run build         # typecheck api (web export is part of deploy)
bun run deploy        # expo export --platform web → apps/api/public, then wrangler deploy
```

Mobile:

```bash
bun run --filter mobile dev
bun run --filter mobile android
```

## EAS (orchestrator)

Do **not** invent `extra.eas.projectId` or commit `EXPO_TOKEN`.

1. From `apps/mobile`, the human runs `eas init` (creates the EAS project and writes `extra.eas.projectId`).
2. Profiles in `eas.json`: `development` (dev client) and `preview` (Android APK, channel `preview`, `runtimeVersion.policy: fingerprint`).
3. Preview build: `eas build --platform android --profile preview`
4. Updates: `eas update --channel preview` (after `eas init`).

### `EXPO_PUBLIC_*` CLI caveat

Expo inlines `EXPO_PUBLIC_*` at **bundle** time. They are not Worker secrets.

- Web on go.pur.run: leave unset so the client uses same-origin `/api`.
- Native preview APK: pass `EXPO_PUBLIC_API_URL=https://go.pur.run/api` as an EAS env / `.env` for the build, not as a Wrangler secret.

## Secrets (wrangler, never commit)

```bash
cd apps/api
bunx wrangler secret put BETTER_AUTH_SECRET
bunx wrangler secret put JWT_SECRET          # legacy JWT fallback; can match Better Auth secret
bunx wrangler secret put IMPORT_TOKEN
bunx wrangler secret put BREVO_API_KEY       # optional
```

Optional vars: `BETTER_AUTH_URL` (https://go.pur.run), `EMAIL_FROM`, `ADMIN_EMAILS`, `MAIL_PROVIDER`.

D1 `gopur` and KV `GOPUR_AUTH` ids live in `apps/api/wrangler.toml`. If you recreate them, replace the ids there. Apply migrations including `0007_better_auth.sql`.

Worker name remains `gopur-app`. Point **go.pur.run** at this Worker.

## Checks

- Typecheck and build (`bun run typecheck`, `bun run deploy` / `build`).
- Vitest only for api + shared.
- No GitHub Actions unless a later stage asks.
