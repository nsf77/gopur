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

- **Expo SDK 58** + Expo Router. **Android preview APK is the success criterion.** No iOS / TestFlight / Apple Developer path. Expo web export is optional.
- TanStack Query + `hc<AppType>` Hono RPC. Native (and preview APK) uses static `process.env.EXPO_PUBLIC_API_URL` (default `https://go.pur.run/api`). Auth client uses `EXPO_PUBLIC_AUTH_URL` (default `https://go.pur.run`).
- Client payload parsing: **Valibot** in `@gopur/shared`. Do not depend on `arktype` in the app.
- i18n: Paraglide JS, locales `zh-Hant` (base) and `en`.
- UI: NativeWind 5 (RC) + Gluestack-compatible provider. Phosphor (`phosphor-react-native`). Accent `#304385`.
- Auth: Better Auth Email OTP + `@better-auth/expo` + SecureStore (web falls back to localStorage). Session token is also sent as `Authorization: Bearer` for Hono RPC.
- Metro: override Expo’s default and set `inlineRequires: false`. Do **not** set `newArchEnabled` in `app.json`.
- Expo web (optional Worker SPA): `expo.web.output` is **`single`**, PNG favicon, `EXPO_OS=web EXPO_NO_BUNDLE_SPLITTING=1` on `export:web`. `nativewind/babel` is native-only. Bun `linker = "hoisted"` so `expo-server` resolves.

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
bun run --filter mobile typecheck
```

## Android preview APK (EAS)

Do **not** invent `extra.eas.projectId` or commit `EXPO_TOKEN`. Only `eas init` may write the project id into `app.json`.

Profiles in `apps/mobile/eas.json`: `development` (dev client APK) and `preview` (internal Android APK, channel `preview`, `runtimeVersion.policy: fingerprint`). Preview `env` pins `EXPO_PUBLIC_API_URL` / `EXPO_PUBLIC_AUTH_URL` to go.pur.run.

### First APK

```bash
cd apps/mobile
bunx eas-cli login          # human; uses Expo account, not a committed token
bunx eas-cli init           # once; writes extra.eas.projectId
bunx eas-cli build --platform android --profile preview
```

Install the APK from the EAS build page (internal distribution). Package id is `run.pur.go`.

### OTA updates (`eas update`)

Fingerprint runtime: JS updates only apply to binaries with the same fingerprint.

`eas.json` `env` is applied on **`eas build`**, not on **`eas update`**. Metro inlines `EXPO_PUBLIC_*` when it bundles, so the update CLI must see them:

```bash
cd apps/mobile
EXPO_PUBLIC_API_URL=https://go.pur.run/api \
EXPO_PUBLIC_AUTH_URL=https://go.pur.run \
bunx eas-cli update --channel preview --message "describe the JS change"
```

Local `.env` (gitignored) is fine for Metro/`expo start`. Copy `apps/mobile/.env.example`.

### Known footguns

- **`inlineRequires: true`** — Expo Metro default. Has crashed preview APKs at launch (require cycles). Keep the override in `metro.config.js` at `false`. Never set it `true`.
- **`newArchEnabled`** — leave unset in `app.json` until NativeWind / Reanimated / Better Auth Expo are proven on a real APK.
- **Fabricated `extra.eas.projectId`** — EAS rejects a made-up UUID. Run `eas init`.
- **`EXPO_PUBLIC_*` not on `eas update`** — APK talks to the wrong host or empty URL. Pass CLI env (above).
- **Dynamic `process.env[name]`** — Metro will not inline. Always use `process.env.EXPO_PUBLIC_API_URL` / `process.env.EXPO_PUBLIC_AUTH_URL` as static member access.
- **Fingerprint mismatch** — native-dep / `app.json` / plugin changes need a new `eas build`, not only `eas update`.
- **`localhost` in a device APK** — the phone cannot reach the developer machine. Preview profile must keep production URLs.
- Android-only. Do not add iOS credentials, `ios` bundle ids, or TestFlight steps.

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
