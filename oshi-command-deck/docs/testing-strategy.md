# Testing Strategy

## Unit Tests

- Announcement parsing: URLs, collaborators, TBD wording, selected-timezone relative dates, explicit JST/UTC clocks, AM/PM, and Japanese 今夜/明後日/半 wording.
- Optional AI parser fallback: disabled-by-default no-network behavior, evidence-backed merges only, and rejection of ungrounded candidates.
- Timezone: Today windows, UTC storage, arbitrary IANA timezone entry, DST 23/25-hour local-day boundaries, and DST-prone timezone formatting.
- Dedupe: provider ID, any incoming source URL, high-confidence talent-time-title match, duplicate evidence merge, negative same-title different-talent case.
- Manual import: UTC conversion, source URL preservation, collaborator parsing, TBD warnings.
- YouTube adapter: channel registry parsing, status/category mapping, missing-credential no-network behavior, quota cost accounting, inferred quota reset cooldowns, and provider-level stop after quota/rate-limit backoff.
- X adapter: handle registry parsing, deterministic announcement mapping, author attribution only through `author_id` plus `includes.users`, missing-credential no-network behavior, rate-limit errors, `x-rate-limit-reset` handling, success-with-zero-remaining cooldowns, and provider-level stop after backoff.
- Configurable registry: branch and demo talent JSON must validate, reject unknown branches, reject malformed provider IDs/handles, reject live-provider activation on manual-only/future branches, and reject duplicate provider IDs before runtime.
- Supabase public read model: safe public view rows map to livestreams without exposing raw source payloads.
- Admin security: disabled local mode, bearer-token jobs, signed HTTP-only token sessions, and server-verified Supabase Auth admin account sessions.
- API rate limits: per-client partitioning, reset windows, bounded memory fallback, Supabase RPC backend with salted hashed bucket keys, machine-readable `RateLimit-Policy`/`RateLimit`/`RateLimit-Backend` headers, and `Retry-After` guidance on 429 responses.
- Admin creator channels: demo fallback, non-admin demo-only reads, schema validation, aliases/tags/confidence parsing, and protected write behavior.
- Production config guard: demo profile stays safe by default, strict production requires both public and server demo mode off, `STREAMS_READ_SOURCE=supabase`, strong admin token, strong Vercel `CRON_SECRET`, contact email, Supabase credentials, `RATE_LIMIT_BACKEND=supabase` plus `RATE_LIMIT_KEY_SALT` or `HOST_RATE_LIMIT_CONFIGURED=true`, at least one official provider registry, no demo provider IDs, complete optional Push config, and complete optional AI fallback config.
- Provider config export: active registry rows produce server-only YouTube/X env JSON, skip inactive rows, dedupe languages/tags, normalize X handles without scraping, and warn on demo, low-confidence, inactive, missing-ID, or non-exported provider rows.
- Admin corrections: correction payload validation, RPC argument mapping, SQL RPC boundary checks, value normalization, public correction transparency, and ingestion overwrite guards for admin-corrected fields.
- Admin ingestion history: demo history fallback, protected read enforcement, and provider error visibility for recent ingestion runs.
- Admin audit logs: demo audit fallback, protected read enforcement, and recent write evidence visibility for ingestion persistence, registry changes, and manual corrections.
- Alert queue: favorite talent/type/language matching, opt-in alert toggles, push-ready versus review-required delivery state, and stale/unverified suppression from push-ready delivery.
- Minecraft grouping: session participants, status, UTC start/end windows, source links, and declared relationship edges remain available to the UI.
- Push subscription lifecycle: subscribe upserts reactivate endpoint rows, user unsubscribe soft-deactivates active rows by endpoint with a reason, browser unsubscribe can succeed independently from server cleanup, missing Supabase degrades honestly, and invalid unsubscribe payloads are rejected.
- Push dispatch: demo subscription fallback for dry runs, endpoint hashing, duplicate suppression keys, missing VAPID degradation, source-preserving notification payloads, 404/410 soft-deactivation, active-row deactivation counts, and same-run skip after terminal provider rejection.
- i18n guard: ja/en catalog key parity, arbitrary BCP 47 tag fallback, SSR and hydrated `lang`/`dir`, locale/timezone cookie hydration, RTL direction, locale-aware formatting, and app-owned JSX text/aria/placeholder strings must route through the catalog before `pnpm verify` passes.
- Env boundary guard: server-only variables from `.env.example` must not be reachable from any `"use client"` module graph, and `next.config.ts` must not expose secrets through `env`.
- PWA cache guard: manifest install metadata, lang/dir/default localized metadata, safe app-shell routes, API/admin/job cache bypasses, static-asset-only stale-while-revalidate, stale-labeled offline stream snapshots, and the dedicated PWA smoke wiring must stay connected to `pnpm verify`.
- Trust/source boundary guard: unofficial status, official YouTube/X API endpoints, provider policy references, no-scraping/no-rehosting copy, source-link attribution, and media/playback restrictions must stay connected to `pnpm verify`.
- Policy review guard: `docs/policy-review.md` must keep primary-source policy links, operational product constraints, release review steps, and package/doc wiring connected to `pnpm verify:policy-review`.
- Release readiness guard: `docs/release-readiness.md` must keep proven local evidence, external proof still required, required release commands, production env gates, primary references, and the no-overclaim completion rule connected to `pnpm verify:readiness`.
- Supabase RLS guard: every public table must enable RLS, branch and public read columns must stay on the allowlist, public views must use `security_invoker`, public column grants must stay on the allowlist, admin helper RPCs must be closed to anonymous users, writer policies must use owner/admin RBAC, and creator-registry/correction/ingestion persistence/source-retention/API rate-limit RPCs must remain service-role only. FK-side indexes for joins/cascades and rate-limit reset cleanup must stay present. The registry RPC must keep registry upsert plus audit logging atomic; the ingestion RPC must keep a transaction-level advisory lock, short statement timeout, atomic upsert/reconcile operations, and provider-error recording.
- Legal/trust catalog coverage: Privacy, Terms, Data Sources, and Contact/Takedown copy must resolve in ja/en without fallback-key leaks and must include privacy storage, push, official APIs, no scraping, no rehosting, and contact evidence boundaries.
- PWA install flow: Settings exposes browser-controlled install availability and keeps install unavailable states honest when `beforeinstallprompt` is not fired.
- Automated accessibility scan: `@axe-core/playwright` scans Home, Favorites, Minecraft, Watch Route, Settings, Admin, Privacy, Terms, Data Sources, and Contact/Takedown across the configured mobile and desktop Playwright projects using WCAG A/AA tags. Automated scans are a regression gate, not a substitute for manual WCAG review.
- Supabase migration smoke: static validation confirms the correction, ingestion persistence, branch/provider registry, source retention, and API rate-limit migrations, rollback-only smoke SQL, anon public branch/view/link reads, source evidence storage, provider error persistence, stale edge reconciliation, provider ID/branch coverage rejection, rate-limit reset/block behavior, privilege checks, and release documentation stay connected to `pnpm verify`.
- Release smoke scripts: static validation confirms `pnpm smoke:supabase`, `pnpm smoke:production-dry-run`, `pnpm test:e2e:admin`, `pnpm capture:release-previews`, and `pnpm verify:release-previews` stay documented, avoid external DB dependencies in static verification, keep the DB URL server-only, run Supabase SQL with `ON_ERROR_STOP=1`, verify `persist=1`/job/Admin 401 gates, support local `--start-server`, check runtime security headers, force a real `admin-login` 429 with `Retry-After`/`RateLimit-Policy`/`RateLimit-Backend`, check non-writing Admin validation failures, verify `CRON_SECRET` cannot unlock Admin APIs, and check `protectedWriteSkipped` on read-only production dry-runs.
- Release preflight guard: `pnpm check:release-preflight -- --strict-production --env-file .env.production.local` combines repository file presence, Node/Corepack/pnpm, Supabase CLI/Docker/psql, production Vercel cron definitions from `vercel.production.json`, strict production env validation, and release preview evidence without becoming part of `pnpm verify`, because it depends on external tooling and real deployment values.
- Vercel Hobby preview deploy: `pnpm deploy:vercel-preview` uses `vercel.preview.json` without Cron, DEMO-mode env overrides, and protected Admin token env, while release preflight keeps production Cron expectations pinned to `vercel.production.json`.
- Watch Route: score reasons are visible and deterministic.

## Integration Tests

- Supabase staging smoke: after applying migrations, run `SUPABASE_DB_URL=postgresql://... pnpm smoke:supabase` to verify anon public view/link reads, the manual correction RPC updates `live_events`, appends `manual_corrections`, writes `audit_logs`, preserves service-role-only execution, verifies the creator-registry RPC upserts `creator_channels` and writes `audit_logs` atomically, verifies ingestion persistence upserts canonical/source rows, stores source evidence excerpts, records provider errors, reconciles stale `event_sources` and `public_event_links`, preserves admin-corrected fields, verifies public branch reads, branch FKs, provider ID format checks, rejects manual-only branch live-provider activation, and verifies source retention dry-run/apply/audit behavior. All scripts roll back their test rows.
- Local Supabase prerequisite check: run `pnpm check:supabase-local` before local `supabase start` / `supabase db reset` work so missing Supabase CLI, Docker runtime, `psql`, `supabase/config.toml`, migration, seed, or smoke SQL prerequisites are reported before the database smoke step.
- Release preflight: run `pnpm check:release-preflight -- --strict-production --env-file .env.production.local` before claiming public production readiness so missing external tools, demo env values, production Vercel cron drift, or stale screenshot evidence are reported in one place.
- Production dry-run smoke: with a production build or staging deployment running, run `ADMIN_JOB_TOKEN=... CRON_SECRET=... pnpm smoke:production-dry-run -- --strict` to verify public stream reads, default dry-run ingestion, unauthenticated `persist=1`/job/Admin rejection, authenticated Admin read APIs, non-writing Admin payload validation, authenticated ingest dry-run, authenticated alert dry-run, authenticated retention dry-run, Vercel cron bearer authorization, cron-token isolation from Admin APIs, runtime security headers, a real throttled `admin-login` response with `Retry-After` and `RateLimit` hints, and `protectedWriteSkipped=true` without requiring provider credentials. For local release checks after `pnpm build`, use `ADMIN_JOB_TOKEN=... CRON_SECRET=... pnpm smoke:production-dry-run -- --strict --start-server` so the runner starts a matching Next production server for the selected `--base-url` only when that URL is not already reachable. To exercise the Supabase read path against a bundle built for demo screenshots, add `OSHI_DEMO_MODE=false NEXT_PUBLIC_DEMO_MODE=false STREAMS_READ_SOURCE=supabase` and `--expect-read-source supabase`.
- Demo ingestion produces canonical streams with no credentials.
- Missing YouTube/X credentials produce provider errors instead of network calls.
- Credentialed live-mode failures do not fall back to demo fixtures.
- Re-running ingestion is idempotent.
- Active persisted provider cooldowns skip the affected adapter from public reads, ingestion runs, ingest jobs, and alert jobs with zero request count and zero quota cost.
- Duplicate provider rows keep a single canonical stream while merging source links, provenance, collaborators, provider errors, and visible conflict IDs for review.
- Field ownership tests confirm later YouTube matches promote canonical identity/live state, vague X unverified text does not override a YouTube schedule, and explicit X cancellation/postponement wording is preserved as reviewable cancellation provenance.
- Push subscription degrades when VAPID is absent.
- Push subscription storage degrades when Supabase is absent and stores only when service credentials are present.
- Push alert job dry-runs with demo fixtures and requires the admin token before exposing dispatch candidates.

## E2E

- Home loads with meaningful stream cards.
- Locale switches to Japanese and updates visible navigation text.
- Settings accepts arbitrary valid BCP 47 locale tags such as `ar-EG`, preserves `html lang`, switches `dir` to RTL when appropriate, and falls back to the reference catalog for app-owned copy.
- Filters update results and clear all recovers.
- Favorites persist locally, including language preferences, and affect Watch Route plus alert queue reasons.
- Favorites exposes both Push enable and Push disable controls.
- Settings shows PWA install status and browser-controlled fallback.
- Settings handles deterministic `beforeinstallprompt` accepted/dismissed flows and `appinstalled` without relying on the real browser prompt timing.
- Legal/trust pages expose unofficial status, practical privacy limits, official API/source policy links, source health, no-scraping/no-rehosting boundaries, and a configured-or-missing contact channel.
- Playwright runs against `next start` from a production build, blocks Service Workers, and the app skips Service Worker registration under `navigator.webdriver` or `NEXT_PUBLIC_DISABLE_SERVICE_WORKER=true` so PWA cache behavior does not serve stale chunks during parallel E2E runs. Service Worker cache policy is checked separately by `pnpm verify:pwa`.
- PWA smoke runs with `serviceWorkers: "allow"` on an isolated production server at `127.0.0.1:3002`; it manually registers `public/sw.js`, verifies the cached app shell can launch `/?source=pwa` while offline, and verifies `/api/streams` is not replayed from Cache Storage.
- Minecraft page shows session source links plus accessible relationship list.
- Admin manual import appears on Home, and ingestion dry-run reports adapter results.
- Admin Ingestion Runs shows recent run history and demo/Supabase source labels.
- Admin Audit Trail shows recent audit history and demo/Supabase source labels.
- Admin Registry Manager renders registry rows and blocks writes without an admin session or bearer token.
- Admin Registry Manager exposes provider config export previews for `YOUTUBE_CHANNELS_JSON` and `X_HANDLES_JSON`, plus review warnings before production env values are copied.
- Admin Conflict Review renders correction controls and blocks correction writes without an admin session or bearer token.
- Admin token gate redirects to login and unlocks with `ADMIN_JOB_TOKEN` in the protected E2E profile. `pnpm test:e2e:admin` runs this flow on a dedicated local production server with a deterministic local token, while Supabase Auth account login is covered at API/unit level without requiring live credentials in demo CI.
- Mobile Admin, desktop 1440px, and Windows-width 1366px have no horizontal overflow.

## Release Preview Evidence

- `pnpm capture:release-previews` captures macOS desktop, Windows desktop, mobile phone, RTL mobile, and optional protected Admin Chrome profiles against a running local app, writes viewport screenshots to `artifacts/screenshots`, and emits `release-preview-manifest-<locale>.json`.
- `pnpm verify:release-previews` validates the generated manifest after capture: required profiles/routes, screenshot file existence, viewport classes, `lang`/`dir`, horizontal overflow, interactive controls, and protected Admin authorization evidence.
- The preview script sets locale/timezone preferences, opens Home, Favorites, Minecraft, Watch Route, Settings, Data Sources, and Admin, records `lang`/`dir`/viewport/final URL in the manifest, and fails if a captured route has horizontal overflow.
- Protected Admin screenshots are captured when `PREVIEW_ADMIN_TOKEN` or `ADMIN_JOB_TOKEN` is present and the target server is running with the same `ADMIN_JOB_TOKEN`; the script unlocks `/admin/login` and captures the authorized Admin console.
- `pnpm capture:desktop-previews` remains as a compatibility alias for the same release preview script.
- Use `PREVIEW_ROUTES=/,/route`, `PREVIEW_LOCALE=en`, `PREVIEW_WIDTH=1366`, `PREVIEW_HEIGHT=768`, or `PREVIEW_BASE_URL=https://...` to reproduce a narrower QA pass without changing app code.
