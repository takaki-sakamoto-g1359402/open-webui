# Oshi Command Deck

Oshi Command Deck is a mobile-first PWA for tracking livestream schedules with visible source health, confidence, stale states, and provenance.

This project is an unofficial fan tool. It is not affiliated with or endorsed by ANYCOLOR Inc. or NIJISANJI. Do not use NIJISANJI/ANYCOLOR logos, character art, copied media, rehosted thumbnails, downloaded video, or downloaded audio.

## MVP Scope

- Home: chronological Today cards with talent, local time, original title, category, collaborators, source links, state, confidence, last checked, and stale labels.
- Favorites: local anonymous talent, type, and language preferences, overlap detection, opt-in alert settings, and an explainable local alert queue.
- Watch Route: explainable scoring from live status, favorites, categories, overlaps, confidence, upcoming starts, and staleness.
- Minecraft: POV session grouping with participants, status, local start/end times, source links, and an accessible relationship list.
- Settings: ja/en locale switch, browser detection, arbitrary IANA timezone selection, PWA/offline/push status.
- Globalization: complete ja/en reference catalogs, arbitrary BCP 47 locale tag storage, catalog fallback, SSR and hydrated `lang`/`dir` updates, RTL direction, and locale-aware Intl formatting.
- Admin: protected production surface shape for registry, provider IDs, corrections, conflicts, ingestion, RLS, and audit logs.
- Legal: Privacy, Terms, Data Sources, Contact/Takedown, and offline pages.

## Demo Mode

The app runs without API keys. Demo fixtures are labeled `DEMO`, low-confidence items are visible, missing credentials are explicit, and provider errors are shown rather than hidden.

Branch and bootstrap talent data are configurable through `config/branches.json` and `config/talents.demo.json`. Validate production registry changes against the official NIJISANJI talent directory before adding provider IDs.

## Usable Local Operations

- Admin manual import stores real schedule items in local browser storage with provenance, UTC time conversion, TBD warnings, and visible source links.
- `/api/streams` is a read-only server route for the PWA. With `NEXT_PUBLIC_DEMO_MODE=false`, `OSHI_DEMO_MODE=false`, `YOUTUBE_DATA_API_KEY`/`YOUTUBE_CHANNELS_JSON`, or `X_BEARER_TOKEN`/`X_HANDLES_JSON`, it fetches official provider data and feeds the Home UI. `OSHI_DEMO_MODE` is server-only and takes precedence at runtime so staging dry-runs are not locked to a demo-built public bundle. When `STREAMS_READ_SOURCE=supabase` is selected for production, it reads only the sanitized Supabase public read model and returns explicit empty/degraded health instead of falling back to provider adapters.
- `/api/ingestion/run` runs a safe dry run by default. Add `?persist=1` plus either the HTTP-only admin session, `Authorization: Bearer <ADMIN_JOB_TOKEN>`, or a Supabase Auth access token for an `admin_members` owner/admin user to write normalized rows, source provenance, run records, provider errors, and audit logs to Supabase through the service-role-only `persist_ingestion_run` RPC. The RPC uses a transaction-level advisory lock, upserts canonical/source rows, reconciles stale event-source/public-link edges, records provider errors, and writes an audit row as one database function.
- `/api/jobs/ingest` is the Vercel-compatible job route. It requires explicit `Authorization: Bearer <ADMIN_JOB_TOKEN>` for manual operations or `Authorization: Bearer <CRON_SECRET>` for Vercel Cron; browser admin cookies are not accepted for scheduled jobs. `?dryRun=1` keeps it read-only.
- `/api/jobs/retention` is the protected source-retention job. It defaults to YouTube API data, `YOUTUBE_API_DATA_RETENTION_DAYS=29`, supports `?dryRun=1`, detaches stale event-source edges before deleting stale raw source payloads, and writes a `source_items.retention_purge` audit row when Supabase is configured.
- Live ingestion reads active persisted provider cooldowns from `provider_errors.retry_after_at` before calling YouTube or X, then skips providers still inside a reset window with zero request count and zero quota cost. During a run, YouTube and X stop the remaining provider requests as soon as quota/rate-limit backoff is detected. X posts are attributed only through official API `author_id` plus `includes.users.username`; text mentions and batch order are not used as author fallback.
- `/api/jobs/alerts` is the Vercel-compatible Push dispatch route. It requires explicit `Authorization: Bearer <ADMIN_JOB_TOKEN>` for manual operations or `Authorization: Bearer <CRON_SECRET>` for Vercel Cron; `?dryRun=1&demo=1` previews candidates without sending. Alert planning also respects active provider cooldowns before evaluating live stream candidates.
- Push alert opt-in creates a browser Push subscription when VAPID is configured and stores endpoint keys, alert toggles, and anonymous favorite preferences server-side when Supabase service credentials are present. Users can disable Push from Favorites; the browser subscription is unsubscribed locally even if server cleanup cannot be confirmed, and active server rows are soft-deactivated with a reason instead of deleted.
- Favorites shows a local alert queue for upcoming, live, Minecraft, and collaboration matches. Stale, low-confidence, TBD, or unverified matches are kept visible for review instead of being marked push-ready.
- Settings listens for the browser-controlled PWA install prompt and shows install-ready, unavailable, accepted, dismissed, or installed states without pretending installation is available.
- Locale and timezone are mirrored into a minimal first-party cookie so later server-rendered visits can start with the right `lang`, `dir`, and display timezone while full anonymous preferences remain local-first.
- Admin Ingestion Runs shows dry-run adapter results plus historical `ingestion_runs` and `provider_errors` when admin auth and Supabase service credentials are present; demo history is shown otherwise. Admin auth can be the HTTP-only admin cookie, `ADMIN_JOB_TOKEN`, a Supabase Auth bearer token whose user belongs to `admin_members`, or the browser login flow that exchanges a verified Supabase access token for an HTTP-only admin account session.
- Admin Registry Manager reads demo rows without admin auth. With admin auth plus Supabase service credentials, it reads provider IDs, handles, aliases, tags, confidence, and active state, then writes changes through the service-role-only `upsert_creator_channel_registry` RPC so the registry upsert and `audit_logs` row are one database function. The migration stores branch taxonomy in `branches`, references it from creator/event rows, validates provider ID formats, and blocks active YouTube/X rows on manual-only/future branches.
- Admin Registry Manager also exports active rows as `YOUTUBE_CHANNELS_JSON` and `X_HANDLES_JSON` previews for server-only provider configuration, with review warnings for demo, low-confidence, inactive, missing-ID, and non-YouTube/X rows.
- Admin Correction Review shows conflicts/provider errors and applies audited manual corrections through a narrow Supabase RPC when write-capable admin auth plus Supabase service credentials are present. Supabase Auth callers are checked against `admin_members`; owner/admin can write, reviewer is read-only. Corrected fields are marked on `live_events` so later ingestion does not silently overwrite them.
- Cross-provider duplicates keep one canonical event while merging source links, provenance, collaborators, provider errors, and visible conflict IDs for review.
- Field ownership is explicit: YouTube controls video identity, URL, and live/ended state; direct X context can add collaborators, TBD, and cancellation/postponement evidence without overwriting a YouTube schedule from vague unverified text; admin corrections still win through audited correction records.
- Admin Audit Trail reads recent `audit_logs` when admin auth and Supabase service credentials are present, with labeled demo audit rows otherwise.
- Privacy, Terms, Data Sources, and Contact/Takedown pages expose operational limits, no-scraping/no-rehosting boundaries, source health, policy references, and a configurable public contact channel through `NEXT_PUBLIC_CONTACT_EMAIL`.
- API routes apply per-client rate limits and emit `RateLimit-Policy`, `RateLimit`, `RateLimit-Backend`, and `Retry-After` on throttled responses so browsers, jobs, and operators get machine-readable backoff guidance. Demo/local runs use a bounded memory fallback; production must use `RATE_LIMIT_BACKEND=supabase` with hashed bucket keys or set `HOST_RATE_LIMIT_CONFIGURED=true` after configuring host/WAF throttling.

## Commands

Use the Node version in `.node-version`; enable Corepack before installing so the pinned pnpm in `packageManager` is available.

```bash
corepack enable
corepack prepare pnpm@10.26.0 --activate
pnpm install
pnpm dev
pnpm lint
pnpm typecheck
pnpm verify:i18n
pnpm verify:env
pnpm verify:security-headers
pnpm verify:pwa
pnpm verify:trust
pnpm verify:policy-review
pnpm verify:readiness
pnpm verify:production-config
pnpm verify:rls
pnpm verify:supabase
pnpm verify:release-smoke
pnpm check:release-preflight
pnpm check:supabase-local
pnpm smoke:supabase
pnpm smoke:production-dry-run
pnpm test
pnpm test:a11y
pnpm build
pnpm test:pwa
pnpm test:e2e
pnpm test:e2e:admin
pnpm capture:desktop-previews
pnpm capture:release-previews
pnpm verify:release-previews
pnpm verify
```

## Production Boundaries

- YouTube ingestion must use the official YouTube Data API.
- X ingestion must use official X APIs only. Scraping is not allowed.
- Announcement AI fallback is optional, server-only, disabled by default, and may only merge evidence-backed candidates after deterministic rules run first.
- Secrets stay server-only. The client may only receive public Supabase anon config and VAPID public key.
- `pnpm verify:env` fails if server-only environment variables from `.env.example` become reachable from a `"use client"` module graph or if `next.config.ts` exposes values through `env`.
- `pnpm verify:pwa` fails if the manifest loses install metadata, the service worker broad-caches API/admin routes, or offline snapshots stop being marked stale in the UI.
- `pnpm verify:trust` fails if unofficial status, official provider API boundaries, no-scraping/no-rehosting limits, external policy references, source-link attribution, or media/playback restrictions are removed.
- `pnpm verify:policy-review` fails if `docs/policy-review.md` loses primary-source policy links, operator constraints, release review steps, or package/doc wiring.
- `pnpm verify:readiness` fails if `docs/release-readiness.md` stops listing proven local evidence, external proof still required, required release commands, env gates, primary references, or the no-overclaim completion rule.
- `pnpm test:pwa` runs a dedicated Service Worker smoke on port 3002 with service workers allowed, while the main E2E suite keeps service workers blocked for deterministic UI tests.
- `pnpm test:a11y` runs `@axe-core/playwright` scans over the core public, legal, settings, and admin surfaces using WCAG A/AA tags; it is also covered by `pnpm test:e2e` and therefore by `pnpm verify`.
- `pnpm verify:security-headers` fails if the global Next.js headers lose CSP, frame protection, HSTS, MIME sniffing protection, referrer policy, or permissions policy.
- `pnpm verify:production-config -- --strict-production --env-file .env.production.local` checks the release env profile before public launch: public and server demo mode off, `STREAMS_READ_SOURCE=supabase`, contact channel, distinct strong admin token and Vercel `CRON_SECRET`, Supabase credentials, `RATE_LIMIT_BACKEND=supabase` plus `RATE_LIMIT_KEY_SALT` or `HOST_RATE_LIMIT_CONFIGURED=true`, provider registries, optional Push, and optional AI fallback.
- `pnpm verify:rls` fails if a public table lacks RLS, a public view loses `security_invoker`, unsafe columns are granted to `anon`/`authenticated`, admin helper RPCs become callable by anonymous users, or the manual correction/source retention/API rate-limit RPCs stop being service-role only.
- `pnpm verify:release-smoke` keeps staging smoke, production dry-run, protected Admin E2E, release preview capture, runtime security-header smoke, and runtime 429 rate-limit probing wired to package scripts and docs without requiring an external database or running server during the static validator.
- `pnpm check:release-preflight -- --strict-production --env-file .env.production.local` is the release operator gate that combines repo files, Node/Corepack/pnpm, Supabase CLI/Docker/psql, Vercel cron definitions, strict production env validation, and release preview evidence. It is intentionally not part of `pnpm verify` because it depends on external tooling and real deployment values.
- `pnpm check:supabase-local` checks whether the Supabase CLI, Docker runtime, `psql`, `supabase/config.toml`, migrations, seed, and smoke SQL are present before attempting local `supabase start` or `supabase db reset`.
- `SUPABASE_DB_URL=postgresql://... pnpm smoke:supabase` runs rollback-only SQL against a migrated staging database through `psql`; keep the DB URL server-only/local-only.
- `ADMIN_JOB_TOKEN=... CRON_SECRET=... pnpm smoke:production-dry-run -- --strict` checks public reads, dry-run ingestion, unauthenticated `persist=1`/job/admin rejection, authenticated Admin read APIs, non-writing admin payload validation, authenticated ingest/alert/retention dry-runs through both manual admin and Vercel cron bearer paths, cron-token isolation from Admin APIs, runtime security headers, a real `Retry-After`/`RateLimit-Policy`/`RateLimit-Backend` 429 probe, and a running production build or staging URL without protected writes. Add `--start-server` after `pnpm build` for local smoke runs when the selected `--base-url` is not already serving the app, and add `--expect-read-source supabase` once production public reads are configured.
- `pnpm test:e2e:admin` runs the protected Admin login/unlock/sign-out-ready browser flow on a dedicated local production server with a deterministic local token, separate from demo-mode E2E.
- `pnpm capture:release-previews` captures macOS desktop, Windows desktop, mobile, RTL mobile, and optional protected Admin screenshots when `PREVIEW_ADMIN_TOKEN`/`ADMIN_JOB_TOKEN` is provided.
- `pnpm verify:release-previews` validates the generated release preview manifest, screenshot files, viewport classes, `lang`/`dir`, horizontal overflow audit, and protected Admin authorization evidence.
- Public, admin, and job API routes must keep rate-limit enforcement active. Throttled responses should include `Retry-After`, current `RateLimit` hints, and `RateLimit-Backend`. Public production must not rely on process-local memory alone; configure `RATE_LIMIT_BACKEND=supabase` with a strong `RATE_LIMIT_KEY_SALT` or document host/WAF throttling with `HOST_RATE_LIMIT_CONFIGURED=true`.
- Raw provider payloads and detailed provider error/correction rows are admin/server-only. Public users read sanitized views plus sanitized provider-error/admin-correction summaries.
- Manual corrections require audit records and must not silently overwrite provider facts.
- Source titles are preserved. Machine translations, if enabled later, must be separate and labeled.

## Guideline Reference

Review current ANYCOLOR, YouTube API, and X Developer policies before launch and whenever monetization, branding, media use, or ingestion behavior changes:

Operational review notes live in `docs/policy-review.md`, and the release proof checklist lives in `docs/release-readiness.md`; refresh both before public launch and after any policy-sensitive or production-infrastructure change.

- <https://www.anycolor.co.jp/guidelines/en/>
- <https://developers.google.com/youtube/terms/api-services-terms-of-service>
- <https://developers.google.com/youtube/terms/developer-policies>
- <https://docs.x.com/developer-terms/agreement>
- <https://docs.x.com/developer-terms/policy>
- <https://datatracker.ietf.org/doc/html/draft-ietf-httpapi-ratelimit-headers>
- <https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/429>
- <https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting>
- <https://nextjs.org/docs/app/api-reference/config/next-config-js/headers>
- <https://nextjs.org/docs/pages/guides/environment-variables>
- <https://www.w3.org/TR/service-workers/>
- <https://www.w3.org/TR/appmanifest/>
- <https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Caching>
- <https://supabase.com/docs/guides/database/postgres/row-level-security>
- <https://supabase.com/docs/guides/database/functions>
- <https://supabase.com/docs/guides/database/tables#view-security>
- <https://supabase.com/docs/guides/local-development/overview>
- <https://supabase.com/docs/guides/local-development/cli/getting-started>
- <https://supabase.com/docs/guides/deployment/database-migrations>
- <https://www.postgresql.org/docs/current/ddl-rowsecurity.html>
- <https://www.postgresql.org/docs/current/ddl-priv.html>
