# Setup and Deploy Guide

## Local Demo

Use the Node version in `.node-version`. Enable Corepack so `packageManager` in `package.json` can provide the pinned pnpm version:

```bash
node --version
corepack enable
corepack prepare pnpm@10.26.0 --activate
pnpm --version
```

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open <http://127.0.0.1:3001>. No YouTube, X, Supabase, or VAPID key is required for demo mode.

The first request uses `Accept-Language` for the initial locale and Asia/Tokyo as the safe timezone fallback. After hydration, the browser timezone is detected and the selected locale/timezone are mirrored into a small first-party cookie so later server-rendered visits start with the same `lang`, `dir`, and display timezone as the client.

## Supabase

1. Create a Supabase project.
2. Apply the SQL files in `supabase/migrations` in filename order.
3. For local database verification, the current Supabase CLI flow uses Docker. Run the prerequisite check first:

```bash
pnpm check:supabase-local
```

When the Supabase CLI, Docker runtime, and `psql` are available, run the official local stack flow from the project root:

```bash
supabase start
supabase db reset
```

This repository includes `supabase/config.toml` for local development. Supabase's current local-development docs describe `supabase init` as the step that creates that file for new projects, the CLI as the way to run a local stack, Docker containers as the runtime, and `db reset` as the migration test step before sharing schema changes. If you intentionally regenerate the config with `supabase init`, review the diff before keeping it.
4. Run `pnpm verify:rls` locally after schema edits to confirm the migration still enables RLS, keeps public reads on sanitized `security_invoker` views and column grants, leaves raw/source/admin tables closed to anonymous roles, and keeps FK-side indexes on high-traffic joins/cascades.
5. Run the rollback-only smoke SQL against a migrated staging database to verify anon public view/link reads, the correction RPC, ingestion persistence RPC, source evidence storage, provider errors, stale edge reconciliation, admin-correction guards, branch FKs, provider ID format checks, manual-only branch live-provider rejection, source retention dry-run/apply/audit behavior, API rate-limit RPC behavior, and execution privileges:

```bash
SUPABASE_DB_URL=postgresql://... pnpm smoke:supabase
```

The runner executes `supabase/smoke/0001_manual_correction_rpc.sql`, `supabase/smoke/0002_ingestion_rpc.sql`, `supabase/smoke/0003_registry_constraints.sql`, `supabase/smoke/0004_source_retention_rpc.sql`, and `supabase/smoke/0005_api_rate_limit_rpc.sql` through `psql --no-psqlrc -v ON_ERROR_STOP=1`. All scripts open a transaction and roll back, so they should not leave smoke rows behind. Keep `SUPABASE_DB_URL` server-only/local-only; it is intentionally not a `NEXT_PUBLIC_*` value and the runner redacts it in logs.
6. Local `supabase db reset` applies `supabase/seed.sql` through `supabase/config.toml` for demo rows.
7. Set these server-side variables in Vercel or your host:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_JOB_TOKEN`
   - `CRON_SECRET`
   - `ADMIN_SESSION_SECRET` (optional separate signing secret for admin account sessions)
   - `RATE_LIMIT_BACKEND=supabase` and `RATE_LIMIT_KEY_SALT`, or `HOST_RATE_LIMIT_CONFIGURED=true` after host/WAF throttling is configured
8. Set client-safe variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_CONTACT_EMAIL`
9. Set `STREAMS_READ_SOURCE=supabase` after ingestion persistence is verified so the public app reads canonical Supabase rows instead of calling provider adapters on each public read. The strict production validator requires this setting.

## Admin Protection

Set `ADMIN_JOB_TOKEN` in production or staging. When it is present, `/admin` redirects to `/admin/login` until either the token is exchanged server-side for a short-lived HTTP-only cookie or a Supabase Auth admin account is verified and exchanged for an HTTP-only admin account session. Job route handlers accept `Authorization: Bearer <ADMIN_JOB_TOKEN>` for manual automation and `Authorization: Bearer <CRON_SECRET>` for Vercel Cron. Vercel sends `CRON_SECRET` as the bearer token for scheduled cron invocations when that environment variable is configured. `CRON_SECRET` is intentionally scoped to job routes and must not unlock Admin UI or Admin API reads/writes.

When `ADMIN_JOB_TOKEN` is absent, the Admin surface remains open for local demo use. Protected writes still require either a write-capable Supabase Auth bearer token or a configured admin token/session.

For account-based admin UI or API access, create a Supabase Auth user and insert the user's UUID into `public.admin_members`. The migration accepts `owner`, `admin`, and `reviewer`; owner/admin can write, reviewer can read protected admin data only. The `/admin/login` Supabase form uses the public anon key to call Supabase Auth, posts the returned access token to `/api/admin/supabase-session`, and the server verifies the JWT plus `admin_members` before issuing its own HTTP-only admin account cookie. Management scripts can also send `Authorization: Bearer <SUPABASE_ACCESS_TOKEN>` directly to admin API routes. Keep `SUPABASE_SERVICE_ROLE_KEY` server-only.

API routes include a shared limiter. Local demo mode defaults to a bounded process-local memory fallback and throttled responses return HTTP 429 with `Retry-After`, `RateLimit-Policy`, `RateLimit`, and `RateLimit-Backend` headers. For production, prefer `RATE_LIMIT_BACKEND=supabase` with `RATE_LIMIT_KEY_SALT` so bucket keys are salted hashes and counters are shared through the service-role-only `check_api_rate_limit` RPC. If you instead rely on Vercel WAF or another host/edge limiter, set `HOST_RATE_LIMIT_CONFIGURED=true` only after that rule is published. The strict production validator fails when neither a persistent Supabase limiter nor an explicit host/WAF limiter is configured.

Next.js exposes `NEXT_PUBLIC_*` values to browser JavaScript at build time. Treat that prefix as intentionally public only, and never use `next.config.ts` `env` for secrets.

Before flipping production traffic, copy the filled deployment variables to a local file that is not committed and run:

```bash
pnpm check:release-preflight -- --strict-production --env-file .env.production.local
pnpm verify:production-config -- --strict-production --env-file .env.production.local
```

The release preflight additionally reports missing repo release files, Node/Corepack/pnpm drift, Supabase CLI/Docker/`psql` availability, Vercel cron route drift, and missing release preview evidence. The strict production profile fails if public or server demo mode is still enabled, public reads are not set to `STREAMS_READ_SOURCE=supabase`, the public contact channel is missing, admin or cron tokens are weak or reused across both roles, Supabase persistence credentials are incomplete, `RATE_LIMIT_BACKEND=supabase` is missing `RATE_LIMIT_KEY_SALT`, no persistent/host rate limiter is configured, no official provider registry is configured, provider registries still contain demo IDs, Push is partially configured, or AI fallback is enabled without its server-only credentials.

With a production build running locally or on staging, run the read-only route smoke:

```bash
ADMIN_JOB_TOKEN=... CRON_SECRET=... pnpm smoke:production-dry-run -- --strict
```

This checks `/api/streams`, dry-run ingestion, unauthenticated job rejection, authenticated ingest dry-run, authenticated alert dry-run, runtime security headers, and a real `admin-login` 429 rate-limit response with `Retry-After`, `RateLimit-Policy`, `RateLimit`, and `RateLimit-Backend` headers, all without protected writes. Add `--base-url https://staging.example.com` for a deployed staging URL, and add `--expect-read-source supabase` after `OSHI_DEMO_MODE=false` and `STREAMS_READ_SOURCE=supabase` are enabled so the smoke fails if public reads drift back to provider adapters.

## Admin Registry Manager

Open `/admin` to review creator/provider rows. The Registry Manager reads demo rows without admin auth. It reads `creator_channels` only when an admin session, Supabase admin account session, or bearer token is present and Supabase service credentials are configured. Saving a row requires the same admin auth plus `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`; successful writes call the service-role-only `upsert_creator_channel_registry` RPC, which upserts provider + provider ID/handle and adds an `audit_logs` row in one database function.

The Registry Manager shows read-only `YOUTUBE_CHANNELS_JSON` and `X_HANDLES_JSON` previews built from active rows. Review the export warnings before copying values; demo IDs, low-confidence rows, inactive rows, missing IDs, non-YouTube/X providers, and active live-provider rows on manual-only/future branches must be resolved or intentionally excluded. The database also stores `branches` as a public RLS table, references it from `creator_channels` and `live_events`, validates provider ID formats, and blocks active YouTube/X rows on manual-only/future branches. Use these previews to configure server-only provider env vars only after verifying each channel ID or handle against official sources.

## Admin Corrections

The Conflict Review panel lists streams with conflicts, provider errors, or prior admin corrections. Applying a correction requires an admin session, Supabase admin account session, or bearer token plus Supabase service credentials. Successful corrections call the `apply_manual_correction` Supabase RPC, which updates the canonical `live_events` field, appends a `manual_corrections` row, writes `audit_logs`, and adds the corrected field to `admin_corrected_fields` in one database function so future ingestion preserves the admin-reviewed value.

## Admin Audit Trail

The Audit Trail panel reads `GET /api/admin/audit-logs`. When admin protection is configured, the route requires an admin session, `Authorization: Bearer <ADMIN_JOB_TOKEN>`, or a Supabase Auth bearer token for an `admin_members` user. With Supabase service credentials it reads recent `audit_logs`; without Supabase it returns labeled demo audit rows so the admin surface still shows the intended evidence shape.

## Provider Credentials

Before adding credentials, update the registry files:

- `config/branches.json`: branch taxonomy, locale hints, coverage labels, and operator notes. Keep legacy or merged branches manual-only until provider ownership is verified.
- `config/talents.demo.json`: demo and bootstrap talent rows used by local mode, favorites, manual import, and admin fallback. Provider IDs must be unique across talents.

Use the official NIJISANJI talent directory as the primary source before production registry changes: <https://www.nijisanji.jp/en/talents>

- `YOUTUBE_DATA_API_KEY`: server-only. Enables official YouTube Data API live/upcoming search.
- `YOUTUBE_API_DATA_RETENTION_DAYS=29`: server-only retention window for stored YouTube API source payloads. Keep this at 29 or lower so `/api/jobs/retention` refreshes or deletes public/non-authorized API data inside the policy window.
- `YOUTUBE_CHANNELS_JSON`: server-only JSON array of channel entries:

```json
[
  {
    "talentId": "kuzuha",
    "displayName": "Kuzuha",
    "channelId": "UCxxxx",
    "branch": "jp",
    "languages": ["ja"],
    "tags": ["game", "collaboration"]
  }
]
```

- `YOUTUBE_MAX_CHANNELS`, `YOUTUBE_MAX_RESULTS`, `YOUTUBE_CACHE_TTL_SECONDS`: quota guardrails for public stream reads.
- `X_BEARER_TOKEN`: server-only. Enables official X recent search ingestion. Scraping is not allowed.
- `X_HANDLES_JSON`: server-only JSON array of official handle entries:

```json
[
  {
    "talentId": "kuzuha",
    "displayName": "Kuzuha",
    "handle": "example_handle",
    "branch": "jp",
    "languages": ["ja"],
    "tags": ["game", "collaboration"]
  }
]
```

- `X_MAX_HANDLES`, `X_HANDLES_PER_QUERY`, `X_MAX_RESULTS`: rate-limit and query-length guardrails.
- `AI_PARSE_FALLBACK_ENABLED=false`: keep the optional AI parser disabled unless you have reviewed cost, privacy, and policy impact.
- `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_RESPONSES_URL`: server-only optional parser fallback using the OpenAI Responses API. Deterministic parsing always runs first; AI candidates are merged only when their evidence quote appears in the source text. Leave these blank for demo mode.
- `VAPID_PRIVATE_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, and `VAPID_SUBJECT`: enable Web Push subscription storage and server-side dispatch. `VAPID_SUBJECT` should be a `mailto:` address or HTTPS contact URL.
- `NEXT_PUBLIC_CONTACT_EMAIL`: public contact address shown on Privacy, Terms, and Contact/Takedown pages. Leave blank only for local demo builds.
- `NEXT_PUBLIC_DEMO_MODE=false`: required before the public bundle should present live/provider-backed operation.
- `OSHI_DEMO_MODE=false`: server-only runtime override required before server routes call live provider APIs or the Supabase public read model. It takes precedence over `NEXT_PUBLIC_DEMO_MODE`, which prevents local/staging dry-runs from being locked to a demo-built public bundle.
- `STREAMS_READ_SOURCE=supabase`: optional for local demo, required by the strict production profile. Reads `public_live_events` plus `public_event_links` from Supabase after ingestion has persisted canonical rows, including public-safe collaborators, conflict IDs, provider error summaries, and source links. When selected, `/api/streams` returns the Supabase read model's empty/degraded state instead of falling back to provider adapters.

Without these credentials, the app stays in demo/degraded mode and labels missing coverage.

## Manual Import

Open `/admin` and use Manual import to add a real schedule item locally. Title, talent, and either a source URL or evidence note are required. The item is stored in browser local storage, converted to UTC, labeled manual/local, and appears on Home, Watch Route, and Minecraft grouping when relevant.

## Push Alerts

Push opt-in is available only when `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, service workers, browser notifications, and PushManager are available. The `/api/push/subscribe` route stores subscriptions in `push_subscriptions` when Supabase service credentials are present, including endpoint keys, alert toggles, and anonymous favorite preferences. `DELETE /api/push/subscribe` soft-deactivates the matching active endpoint with `deactivated_at` and `deactivation_reason='user_unsubscribe'`; it does not require VAPID to be configured because a stop request should work even when sending is disabled. The client also calls the browser `PushSubscription.unsubscribe()` independently, so a device can stop local delivery even when server cleanup cannot be confirmed. Without VAPID or Supabase, routes return degraded responses instead of pretending alerts are active.

The dispatch job is `GET /api/jobs/alerts`. Use this read-only check before enabling sends:

```http
GET /api/jobs/alerts?dryRun=1&demo=1
Authorization: Bearer <ADMIN_JOB_TOKEN or CRON_SECRET>
```

Dry runs can use demo fixtures without Supabase. Real dispatch requires Supabase service credentials, active subscriptions, VAPID settings, and either `ADMIN_JOB_TOKEN` for manual job calls or `CRON_SECRET` for Vercel Cron. Sent notifications are recorded in `push_delivery_receipts` by subscription and notification key so repeated cron runs do not resend the same alert. Push provider 404/410 responses soft-deactivate that subscription with a provider reason, count only rows that changed from active to inactive, and skip remaining notifications for it in the same run.

## PWA Install

The app ships `public/manifest.webmanifest` and `public/sw.js`. Settings listens for the browser-owned `beforeinstallprompt` event; if the browser does not provide it, the install button stays disabled and the UI labels the state as unavailable instead of faking an install action.

Run `pnpm verify:pwa` after manifest, Service Worker, offline, or Push changes. The Service Worker precaches the public app shell and static assets only. It bypasses `/api/*`, `/admin`, Next server/data routes, jobs, session, ingestion, and Push writes so dynamic data is never replayed from an unlabeled runtime cache. The client stores the last successful `/api/streams` response as a local read-only offline snapshot and marks its source health stale until a fresh network read succeeds.

Run `pnpm test:pwa` after `pnpm build` when changing Service Worker behavior. This dedicated smoke uses an isolated production server on `127.0.0.1:3002` with Playwright service workers allowed, manually registers `/sw.js`, verifies offline launch from `/?source=pwa`, and checks that `/api/streams` is not stored in Cache Storage. Keep the main E2E suite service-worker-blocked for deterministic UI regression tests.

## Release UI Previews

With the local app running, generate release preview evidence across Mac desktop, Windows desktop, mobile, RTL mobile, and optional protected Admin views. Use a production server for release screenshots so framework development indicators do not appear in the images:

```bash
pnpm build
ADMIN_JOB_TOKEN=... pnpm start
PREVIEW_ADMIN_TOKEN=... pnpm capture:release-previews
pnpm verify:release-previews
```

The script writes viewport screenshots and `release-preview-manifest-<locale>.json` to `artifacts/screenshots`, using macOS and Windows Chrome user-agent/platform profiles plus mobile and RTL profiles. It opens the core public/admin surfaces, sets the selected locale and timezone, unlocks protected Admin when `PREVIEW_ADMIN_TOKEN`/`ADMIN_JOB_TOKEN` is present, and fails if any captured route introduces horizontal overflow. `pnpm verify:release-previews` then validates the manifest, screenshot files, viewport classes, `lang`/`dir`, overflow audit, interactive controls, and protected Admin authorization evidence. Use `PREVIEW_LOCALE=en`, `PREVIEW_ROUTES=/,/route`, or `PREVIEW_WIDTH=1366 PREVIEW_HEIGHT=768` for targeted review passes. `pnpm capture:desktop-previews` remains as a compatibility alias for the same script.

## Vercel Jobs

`vercel.json` defines `/api/jobs/ingest` every 30 minutes, `/api/jobs/alerts` every 10 minutes, and `/api/jobs/retention` daily. All three routes require:

```http
Authorization: Bearer <ADMIN_JOB_TOKEN or CRON_SECRET>
```

Use `GET /api/jobs/ingest?dryRun=1` for read-only verification. Without `dryRun=1`, the route persists normalized events, source items, event-source provenance, ingestion runs, provider errors, and audit logs through the Supabase service-role-only `persist_ingestion_run` RPC. The RPC keeps the database write phase short, uses a transaction-level advisory lock, preserves admin-corrected fields, and reconciles stale event-source/public-link edges for the affected canonical events.

Use `GET /api/jobs/retention?dryRun=1&provider=youtube` for read-only source retention verification. Without `dryRun=1`, the route calls the Supabase service-role-only `purge_stale_source_items` RPC, detaches stale `event_sources` rows, deletes stale YouTube `source_items`, and writes a `source_items.retention_purge` audit row. The Vercel cron runs this daily, requires `CRON_SECRET`, and defaults to `YOUTUBE_API_DATA_RETENTION_DAYS=29`.

Use `GET /api/jobs/alerts?dryRun=1&demo=1` to verify alert candidate generation without sending Push notifications. Without `dryRun=1`, the route evaluates active subscriptions, suppresses previously sent notification keys, sends through Web Push, records delivery receipts, and deactivates expired endpoints when the push provider returns 404 or 410. Alert planning reads active provider cooldowns before ingestion so a Push cron does not spend YouTube/X quota that an ingest job already backed off. Vercel Cron uses `CRON_SECRET`; manual operator calls may use `ADMIN_JOB_TOKEN`.

For interactive checks, `POST /api/ingestion/run` is dry-run by default. Add `?persist=1` plus the same job-token Authorization header, or a Supabase Auth bearer token for an owner/admin member, to persist.

## Release Gate

Before public launch:

- Verify current ANYCOLOR/NIJISANJI fan and secondary creation guidelines.
- Verify YouTube Data API and X API policy compliance.
- Verify API rate-limit responses expose `Retry-After`, `RateLimit-Policy`, `RateLimit`, and `RateLimit-Backend` headers. Configure `RATE_LIMIT_BACKEND=supabase` with a strong `RATE_LIMIT_KEY_SALT`, or configure and publish host/edge throttling before setting `HOST_RATE_LIMIT_CONFIGURED=true`.
- Run `pnpm verify:env` after adding or renaming environment variables. Only `NEXT_PUBLIC_*` values should be reachable from client components; keep provider tokens, service-role keys, job tokens, VAPID private keys, and AI credentials server-only.
- Run `pnpm verify:pwa` after changing the manifest, Service Worker, offline cache, install flow, or Push capability detection.
- Run `pnpm verify:trust` after changing provider adapters, legal/trust pages, source links, policy references, media handling, or playback/embed behavior.
- Run `pnpm verify:policy-review` after changing `docs/policy-review.md`, policy references, release review steps, trust copy, provider integrations, media handling, or public deployment controls.
- Run `pnpm verify:readiness` after changing `docs/release-readiness.md`, external release prerequisites, staging smoke commands, production env gates, or completion criteria.
- Run `pnpm test:pwa` after Service Worker fetch or offline-cache changes to exercise the real browser registration path.
- Run `pnpm verify:production-config -- --strict-production --env-file .env.production.local` against the exact env values planned for production, including both `ADMIN_JOB_TOKEN` and Vercel `CRON_SECRET`, plus either `RATE_LIMIT_BACKEND=supabase` with `RATE_LIMIT_KEY_SALT` or `HOST_RATE_LIMIT_CONFIGURED=true`.
- Run `pnpm verify:rls` after any migration or RPC change that touches public reads, admin helpers, creator registry writes, corrections, audit logs, push subscription storage, or provider raw payloads.
- Run `pnpm verify:release-smoke` after changing smoke commands, release docs, or staging dry-run scripts.
- Run `pnpm check:release-preflight -- --strict-production --env-file .env.production.local` before public launch to combine repo release files, external tool availability, Vercel cron definitions, strict env validation, and preview evidence in one operator report. This command is intentionally separate from `pnpm verify` because it depends on external tooling and real deployment values.
- Run `pnpm check:supabase-local` before local Supabase stack work to confirm the CLI, Docker runtime, `psql`, migration, seed, and smoke SQL prerequisites are present.
- Run `pnpm smoke:production-dry-run -- --strict` against a running production build or staging deployment with `ADMIN_JOB_TOKEN` and `CRON_SECRET` configured. For local release smoke after `pnpm build`, use `ADMIN_JOB_TOKEN=... CRON_SECRET=... pnpm smoke:production-dry-run -- --strict --start-server`; it reuses an already reachable base URL or starts a matching Next production server for the selected `--base-url` and stops it after the read-only checks finish. The strict smoke checks unauthenticated `persist=1` rejection, Admin API unauthenticated gates, authenticated Admin read APIs, non-writing Admin validation failures, cron-token isolation from Admin APIs, runtime security headers, a real `admin-login` 429 header/body probe, and the hosted cron header path with `Authorization: Bearer <CRON_SECRET>` for ingest, alerts, and retention dry-runs.
- Run `pnpm test:e2e:admin` to exercise the protected Admin login/unlock UI in a dedicated local production server profile. This complements the default demo-mode E2E and keeps the protected route from staying skipped in normal release verification.
- Run `pnpm verify`.
- Confirm any new app-owned UI strings were added to both ja/en catalogs; `pnpm verify:i18n` is included in `pnpm verify`.
- In a migrated Supabase staging project, run `pnpm smoke:supabase` after schema changes that touch corrections, audit logs, RLS, public view grants, function grants, ingestion persistence, source evidence, provider errors, source retention, event-source/public-link reconciliation, branches, creator provider IDs, branch coverage, or provider-config export.
- Run manual mobile QA plus `pnpm capture:release-previews` and `pnpm verify:release-previews` for macOS desktop, Windows desktop, mobile, RTL mobile, and optional protected Admin evidence. For protected Admin screenshots, start the preview target with `ADMIN_JOB_TOKEN` and pass the same value as `PREVIEW_ADMIN_TOKEN`.
- Confirm no official logos, character art, thumbnails, video, or audio are rehosted.
- Confirm Privacy, Terms, Data Sources, and Contact/Takedown pages are reachable on mobile and desktop.
- Confirm `NEXT_PUBLIC_CONTACT_EMAIL` is set for public deployments.

Policy review notes are tracked in `docs/policy-review.md`. Refresh them from the primary sources before launch, monetization, provider integration, media handling, or brand/trust changes.
