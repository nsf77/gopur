# Gopur

Bun + Turborepo: Expo app (`apps/mobile`) and Hono API (`apps/api`) on **one Cloudflare Worker**, plus `@gopur/shared`.

## Layout

- `apps/api` — Hono 4, ArkType, Better Auth Email OTP, Drizzle + D1, KV `GOPUR_AUTH`, Durable Object `CHAT_HUB`. Worker `gopur-app`.
- `apps/mobile` — Expo SDK 58, Expo Router, TanStack Query, Hono RPC (`hc<AppType>`), Paraglide `zh-Hant` + `en`, NativeWind 5, Better Auth Expo + SecureStore.
- `packages/shared` — Valibot schemas and event/profile helpers.

The Worker serves Expo web static files from `apps/api/public` and `/api/*` (plus `/ws`). Domain: **go.pur.run**.

## Surfaces

- Home feed, explore, event detail (like/save/share)
- Email OTP login (Better Auth)
- Chat list + thread (relay HTTP; WebSocket on `/ws`)
- My events, host editor
- Profile, settings, notifications
- Importer cron `0 16 * * *` and `POST /api/import/run`

## Setup

Requires [Bun](https://bun.sh).

```bash
bun install
bun run typecheck
```

## Develop

```bash
# API Worker: http://localhost:8787
bun run dev:api

# Expo (Metro): http://localhost:8081
bun run dev:mobile
```

Set `EXPO_PUBLIC_API_URL=http://localhost:8787/api` when the Expo app is not same-origin with the Worker.

## Deploy

```bash
bun run deploy
```

Exports Expo web into `apps/api/public`, then `wrangler deploy` from `apps/api`.

Secrets (dashboard or `wrangler secret put`): `BETTER_AUTH_SECRET`, `JWT_SECRET`, `IMPORT_TOKEN`, optional `BREVO_API_KEY` / `EMAIL_FROM` / `ADMIN_EMAILS`.

## EAS (Android)

`apps/mobile/eas.json` has `development` and `preview` (APK, channel `preview`, fingerprint runtime). Run `eas init` in `apps/mobile` before the first build — do not invent `extra.eas.projectId`. See `AGENTS.md`.

Android-only. No iOS / TestFlight path.

## Checks

```bash
bun run typecheck
bun run test
```
