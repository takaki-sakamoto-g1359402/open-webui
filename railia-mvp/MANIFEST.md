# Railia MVP Artifact

This branch records the verified Railia MVP frontend artifact.

## App

- Name: Railia
- Subtitle: AIで小さく働き、実績を積む
- Local verification URL: http://127.0.0.1:3000
- Source path in this PR: `frontend/`
- Local archive prepared during validation: `/tmp/railia-mvp-frontend-2026-06-19.tar.xz`
- Archive SHA-256: `5d24d00be87b9c8e94639bb4e6ddba8e3c1bc1fa2a38193328c553e3ab34bf1d`

## Verified Flow

- Landing page and role selector
- Worker dashboard
- Task list
- Task work page
- AI draft editing and checklist submission
- Pending reward in wallet
- Client approval
- Admin mock payment
- Audit log update

## Local Checks

- `node scripts/verify-railia-mvp.mjs`: passed
- `tsc --noEmit --incremental false --pretty false`: passed
- `next lint`: passed
- `next build`: passed, 11 routes generated
- Browser smoke: passed with no console warnings/errors

## Notes

Issues are disabled on this repository, so the completion audit is recorded in this PR artifact instead of a GitHub Issue.

This PR includes the full `frontend/` source, excluding generated folders such as `node_modules` and `.next`.
