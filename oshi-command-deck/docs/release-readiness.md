# Release Readiness Audit

Last reviewed: 2026-06-20

This audit is intentionally stricter than the local demo. The app can run and be tested without credentials, but public production readiness is not proven until the external checks below pass against real Supabase, YouTube Data API, X API, VAPID, and deployment environments.

## Proven In This Repository

- Product routes exist for Home, Favorites, Minecraft, Watch Route, Settings, legal/trust pages, and the protected Admin surface.
- `pnpm verify` covers lint, TypeScript, i18n catalog parity, server-only env boundaries, security headers, PWA cache policy, legal/trust boundaries, policy-review wiring, production config rules, RLS/static migration guards, release-smoke wiring, unit/integration tests, production build, Service Worker smoke, and E2E core flows.
- `pnpm verify:i18n` blocks app-owned JSX text that bypasses the ja/en catalogs and keeps arbitrary BCP 47 locale behavior covered by tests.
- `pnpm verify:pwa` and `pnpm test:pwa` cover manifest install metadata, cache allowlist/denylist, public app-shell offline launch, static-asset caching, and no API replay from Cache Storage.
- `pnpm verify:security-headers` statically checks the global Next.js CSP, frame protection, HSTS, MIME sniffing protection, referrer policy, and permissions policy.
- `pnpm verify:rls` statically checks RLS, public `security_invoker` views, public column grants, admin-only tables, service-role-only RPCs, FK-side indexes, the API rate-limit RPC, and bounded ingestion/retention functions.
- `pnpm verify:supabase` statically checks rollback-only smoke SQL for manual corrections, ingestion persistence, registry constraints, source retention, API rate limiting, direct table privilege denial, and idempotent ingestion counts.
- `pnpm smoke:production-dry-run -- --strict --start-server` checks a production build locally without protected writes, using `ADMIN_JOB_TOKEN` for Admin API reads and both `ADMIN_JOB_TOKEN` and `CRON_SECRET` bearer paths for job dry-runs.
- `pnpm smoke:production-dry-run -- --strict --start-server` also checks runtime security headers and forces a real `admin-login` 429 response with `Retry-After`, `RateLimit-Policy`, and `RateLimit-Backend`.
- `pnpm test:e2e:admin` runs the protected Admin token login flow on a dedicated production server profile instead of leaving it skipped in demo E2E.
- `pnpm capture:release-previews` captures macOS desktop, Windows desktop, mobile, RTL mobile, and optional protected Admin screenshot evidence with manifest audits.
- `pnpm verify:release-previews` validates generated preview manifests, screenshot files, viewport classes, `lang`/`dir`, horizontal overflow, interactive controls, and protected Admin authorization evidence.
- The production dry-run checks unauthenticated `persist=1` rejection, unauthenticated Admin API rejection, authenticated Admin read APIs, non-writing Admin payload validation failures, and verifies `CRON_SECRET` cannot unlock Admin APIs.
- `pnpm smoke:production-dry-run -- --strict --start-server --expect-read-source supabase` confirms `/api/streams` stays on the Supabase public read path when production public reads are selected.
- `pnpm check:release-preflight` now combines repository release files, Node/Corepack/pnpm, Supabase CLI/Docker/psql, Vercel cron definitions, production env validation, and release preview evidence into one operator-facing readiness report.
- `pnpm check:supabase-local` now finds the repository-owned migration, seed, smoke SQL, and `supabase/config.toml` before checking external local tools.
- `.node-version` and the Corepack setup instructions pin the expected local Node/pnpm bootstrap path for contributors and CI-like shells.

## External Proof Still Required

- Run the real Supabase local or staging stack. This environment currently lacks the Supabase CLI, Docker runtime, Docker daemon, and `psql`; therefore `supabase start`, `supabase db reset`, and `SUPABASE_DB_URL=... pnpm smoke:supabase` have not been executed here.
- Apply migrations to a staging Supabase project and run the rollback-only smoke SQL with a real `SUPABASE_DB_URL`.
- Configure real `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, then verify Admin registry/correction/history/audit reads and writes against Supabase Auth admin membership.
- Configure real YouTube Data API credentials and real channel registry rows, then verify upcoming/live discovery, batch `videos.list`, quota handling, embeddability metadata, and retention behavior against official API responses.
- Configure real X API credentials and real handle registry rows, then verify official API search, rate-limit handling, author attribution through `author_id` plus `includes.users`, URL/date/TBD/collaboration parsing, and no scraping fallback.
- Configure a real VAPID keypair and subject, subscribe from a supported browser, then verify Push subscription storage, dispatch, duplicate suppression, and unsubscribe/deactivation against a staging Supabase project.
- Configure Vercel `CRON_SECRET` and verify scheduled ingest, alerts, and retention dry-run endpoints accept `Authorization: Bearer <CRON_SECRET>` while rejecting requests without a bearer token, and that the same token cannot unlock Admin API routes.
- Configure `RATE_LIMIT_BACKEND=supabase` with a strong `RATE_LIMIT_KEY_SALT` and verify shared counters through staging Supabase, or configure/publish Vercel WAF or equivalent host rate limiting before setting `HOST_RATE_LIMIT_CONFIGURED=true`.
- Deploy to the intended Vercel or equivalent environment and run the strict production dry-run against the deployed URL.
- Refresh the policy review against current ANYCOLOR/NIJISANJI fan guidelines, YouTube API terms/policies, and X developer policies before public launch or monetization.

## Required Release Commands

```bash
pnpm verify
pnpm check:release-preflight -- --strict-production --env-file .env.production.local
node --version
corepack enable
corepack prepare pnpm@10.26.0 --activate
pnpm check:supabase-local
supabase start
supabase db reset
SUPABASE_DB_URL=postgresql://... pnpm smoke:supabase
pnpm verify:security-headers
pnpm verify:production-config -- --strict-production --env-file .env.production.local
ADMIN_JOB_TOKEN=... CRON_SECRET=... pnpm smoke:production-dry-run -- --strict --base-url https://staging.example.com --expect-read-source supabase
pnpm test:e2e:admin
PREVIEW_ADMIN_TOKEN=... pnpm capture:release-previews
pnpm verify:release-previews
curl -fsS -H "Authorization: Bearer $CRON_SECRET" "$BASE_URL/api/jobs/ingest?dryRun=1"
curl -fsS -H "Authorization: Bearer $CRON_SECRET" "$BASE_URL/api/jobs/alerts?dryRun=1&demo=1"
curl -fsS -H "Authorization: Bearer $CRON_SECRET" "$BASE_URL/api/jobs/retention?dryRun=1&provider=youtube"
```

## Environment Gate

The production env must satisfy all of these before public release:

- `NEXT_PUBLIC_DEMO_MODE=false`
- `OSHI_DEMO_MODE=false`
- `STREAMS_READ_SOURCE=supabase`
- `RATE_LIMIT_BACKEND=supabase` with `RATE_LIMIT_KEY_SALT`, or `HOST_RATE_LIMIT_CONFIGURED=true` after host/WAF throttling is configured
- `NEXT_PUBLIC_CONTACT_EMAIL` points to a real contact/takedown address
- `ADMIN_JOB_TOKEN` is non-placeholder and at least 32 characters
- `CRON_SECRET` is non-placeholder and at least 32 characters for Vercel scheduled jobs
- `ADMIN_JOB_TOKEN` and `CRON_SECRET` are distinct values
- Supabase public and service-role credentials are complete
- At least one official YouTube or X provider registry is configured
- Provider registry rows do not contain demo IDs, placeholders, or unverified copied data
- Optional Push config is either complete or entirely absent
- Optional AI fallback config is either complete and policy-reviewed or disabled

## Primary References

- Supabase CLI local development: https://supabase.com/docs/guides/local-development/cli/getting-started
- Supabase CLI config: https://supabase.com/docs/guides/local-development/cli/config
- Supabase seeding: https://supabase.com/docs/guides/local-development/seeding-your-database
- Supabase database functions: https://supabase.com/docs/guides/database/functions
- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- YouTube Data API policies: https://developers.google.com/youtube/terms/developer-policies
- YouTube `search.list`: https://developers.google.com/youtube/v3/docs/search/list
- YouTube `videos.list`: https://developers.google.com/youtube/v3/docs/videos/list
- X Developer Policy: https://docs.x.com/developer-terms/policy
- X Developer Guidelines: https://docs.x.com/developer-guidelines
- X rate limits: https://docs.x.com/x-api/fundamentals/rate-limits
- Vercel WAF rate limiting: https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting
- Vercel Cron Jobs: https://vercel.com/docs/cron-jobs/manage-cron-jobs
- Next.js headers: https://nextjs.org/docs/app/api-reference/config/next-config-js/headers

## Completion Rule

Do not claim production completion while any External Proof item is unverified. Demo completion and local static verification are useful milestones, not substitutes for credentialed staging proof.
