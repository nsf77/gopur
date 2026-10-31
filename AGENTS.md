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
- Layout: `ScreenSafeArea` uses `StyleSheet` `flex: 1` (NativeWind `className="flex-1"` on SafeAreaView is unreliable on APKs).
- Expo web is optional. Do not treat `export:web` as the APK success criterion.

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

Android preview APK **must run**. Web export is optional.

Do **not** invent `extra.eas.projectId` or commit `EXPO_TOKEN`. Do **not** copy Shopur’s EAS project id or Worker URLs. Only the orchestrator/`eas init` may write `extra.eas.projectId` into `app.json`.

Profiles in `apps/mobile/eas.json`: `development` (dev client APK) and `preview` (internal Android APK, channel `preview`, `runtimeVersion.policy: fingerprint`). Preview **build** env (Gopur Worker only):

- `EXPO_PUBLIC_API_URL=https://go.pur.run/api`
- `EXPO_PUBLIC_AUTH_URL=https://go.pur.run`

`eas-build-post-install` compiles Paraglide into `src/paraglide` and runs `packages/shared` `build` (`tsc --noEmit`). EAS workers do not run the mobile `dev` script.

### First APK

```bash
cd apps/mobile
bunx eas-cli login          # human; uses Expo account, not a committed token
bunx eas-cli init           # orchestrator; writes extra.eas.projectId
bunx eas-cli build --platform android --profile preview
```

Install the APK from the EAS build page (internal distribution). Package id is `run.pur.go`.

### OTA updates (`eas update`)

Fingerprint runtime: JS updates only apply to binaries with the same fingerprint.

**`eas update` does not read `eas.json` `build.env`.** Metro inlines `EXPO_PUBLIC_*` at bundle time. Use the script (it exports Gopur URLs on the CLI):

```bash
cd apps/mobile
bun run eas:update:preview -- --message "describe the JS change"
```

Equivalent:

```bash
EXPO_PUBLIC_API_URL=https://go.pur.run/api \
EXPO_PUBLIC_AUTH_URL=https://go.pur.run \
bunx eas-cli update --channel preview --message "describe the JS change"
```

Client URLs go through `src/lib/resolve-base-url.ts` (`process.env.EXPO_PUBLIC_API_URL` / `EXPO_PUBLIC_AUTH_URL` as static member access). Local `.env` (gitignored) is fine for Metro/`expo start`. Copy `apps/mobile/.env.example`.

### Known footguns

- **`inlineRequires: true`** — Expo Metro default. Has crashed preview APKs at launch. Keep `metro.config.js` at `false`. Never set it `true`.
- **`newArchEnabled`** — leave unset in `app.json`.
- **Fabricated `extra.eas.projectId`** — EAS rejects a made-up UUID. `eas init` only. Never copy Shopur’s project id.
- **`eas.json` env vs `eas update`** — build env is not applied to updates. Use `eas:update:preview`.
- **Dynamic `process.env[name]`** — Metro will not inline. Use `resolve-base-url.ts`.
- **`expo-router` `ActivityContents`** — native host view + `React.Activity` has crashed APKs. Metro shims it to return `children` only (no RN `View`).
- **`expo-glass-effect` / `expo-blur` / FlashList** — pulled or tempting to import; Metro shims them, and `src/lib/lazy-native.ts` lazy-`require`s them. Do not top-level import.
- **NativeWind SafeArea `flex-1`** — use `ScreenSafeArea` (`StyleSheet` `flex: 1`).
- **Missing Paraglide / shared on EAS** — without `eas-build-post-install`, the APK bundle cannot resolve `src/paraglide` or workspace TS.
- **Fingerprint mismatch** — native-dep / `app.json` / plugin changes need a new `eas build`.
- **`localhost` in a device APK** — preview URLs must stay `https://go.pur.run`.
- Android-only. Do not add iOS credentials, bundle ids, or TestFlight steps.

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
