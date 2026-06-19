# Policy Review Notes

Last reviewed: 2026-06-20

This file is an operator checklist, not legal advice. Refresh it before any public launch, monetization change, provider integration change, media handling change, or brand/trust copy change.

## Primary Sources

- ANYCOLOR Guidelines for Secondary Creation: https://www.anycolor.co.jp/guidelines/en/
- YouTube API Services Terms of Service: https://developers.google.com/youtube/terms/api-services-terms-of-service
- YouTube API Services Developer Policies: https://developers.google.com/youtube/terms/developer-policies
- X Developer Agreement: https://docs.x.com/developer-terms/agreement
- X Developer Policy: https://docs.x.com/developer-terms/policy
- X Developer Terms index: https://docs.x.com/developer-terms
- X Developer Guidelines: https://docs.x.com/developer-guidelines
- X API Rate Limits: https://docs.x.com/x-api/fundamentals/rate-limits
- X API Search query guide: https://docs.x.com/x-api/posts/search/integrate/build-a-query
- IETF HTTPAPI RateLimit header draft: https://datatracker.ietf.org/doc/html/draft-ietf-httpapi-ratelimit-headers
- MDN 429 Too Many Requests reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/429
- Vercel WAF Rate Limiting: https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting
- Vercel Cron Jobs: https://vercel.com/docs/cron-jobs/manage-cron-jobs
- W3C Service Workers: https://www.w3.org/TR/service-workers/
- W3C Web App Manifest: https://www.w3.org/TR/appmanifest/
- W3C Push API: https://www.w3.org/TR/push-api/
- RFC 8292 VAPID for Web Push: https://datatracker.ietf.org/doc/html/rfc8292
- MDN Push API: https://developer.mozilla.org/en-US/docs/Web/API/Push_API
- Supabase Database Functions guide: https://supabase.com/docs/guides/database/functions
- Supabase Row Level Security guide: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase view security guide: https://supabase.com/docs/guides/database/tables#view-security

## Current Product Constraints

- Keep the service explicitly unofficial and not affiliated with or endorsed by ANYCOLOR or NIJISANJI.
- Do not use NIJISANJI or ANYCOLOR logos, character art, copied official media, downloaded video, downloaded audio, or rehosted thumbnails.
- Use links to original YouTube and X sources. Do not iframe, autoplay, background-play, download, proxy, or rehost provider media.
- YouTube ingestion must use the official YouTube Data API. The app should not collect YouTube user credentials and should not store YouTube audiovisual content.
- YouTube public/non-authorized API data that is stored for operational caching must be refreshed by ingestion or deleted by `/api/jobs/retention` within the policy window and shown with current/stale context.
- X ingestion must use official X APIs and configured API credentials. Do not scrape X pages, expose API credentials, or use X content for prohibited derived services, advertising targeting, or model training.
- X queries must stay within the configured use case, respect rate limits, and attribute public posts only from API-returned author metadata.
- Raw provider payloads, detailed provider error rows, admin correction rows, audit logs, service-role credentials, provider tokens, VAPID private keys, and AI parser credentials stay server/admin scoped. Public pages may show sanitized provider-error and admin-correction summaries only.
- Public users read sanitized Supabase views or read-only adapter output. Demo fixtures must stay visibly labeled as DEMO.
- Public production must use shared Supabase rate-limit counters with salted hashed bucket keys or a configured host/WAF limiter; process-local memory is acceptable only as a demo/fallback guardrail.
- Manual corrections must preserve source provenance, write audit records, and avoid silently overwriting provider-controlled facts.
- Optional AI parsing is server-only, disabled by default, evidence-bound, and cannot replace deterministic rules or original source text.
- Push alerts require explicit user opt-in, browser-controlled subscription state, server-side dispatch dedupe, and a degraded state when VAPID or Supabase is absent.
- VAPID configuration must keep the private key server-only; only the public application server key may be exposed to the browser subscription flow.
- Public deployment requires a real `NEXT_PUBLIC_CONTACT_EMAIL` for privacy, terms, and takedown requests.

## Release Review Steps

1. Re-open every primary source above and confirm that the current behavior still fits the policy text.
2. Run `pnpm verify:trust` and `pnpm verify:policy-review` after any trust, legal, provider, media, or source-link change.
3. Run `pnpm verify:production-config -- --strict-production --env-file .env.production.local` before public launch.
4. Run `SUPABASE_DB_URL=postgresql://... pnpm smoke:supabase` against migrated staging before relying on persisted data.
5. Run `ADMIN_JOB_TOKEN=... CRON_SECRET=... pnpm smoke:production-dry-run -- --strict --start-server` locally after `pnpm build`, or pass `--base-url` for staging.
6. Confirm no official logo, official character art, copied media, YouTube thumbnail download, video/audio download, autoplay, iframe, embed playback, or provider media proxy has been introduced.
7. Confirm public pages for Privacy, Terms, Data Sources, and Contact/Takedown are reachable in ja/en and show the configured contact channel.
