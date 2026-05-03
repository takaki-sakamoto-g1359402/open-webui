# FounderVerse Distribution Checklist

Use this checklist before sharing a FounderVerse MVP Demo URL with private alpha users.

Positioning:

```text
FounderVerse MVP Demo
A trust-gated virtual space prototype for verified decision makers.
```

This is not a production identity service. It does not issue official identity documents.

## Build Readiness

- [ ] Unity project opens without script compilation errors.
- [ ] WebGL is selected as the build target.
- [ ] MVP scenes are included in Scenes In Build.
- [ ] Build output is created at `Build/WebGL`.
- [ ] `Build/WebGL/index.html` exists.
- [ ] `Build/WebGL/Build/` exists.
- [ ] `Build/WebGL/TemplateData/` exists.
- [ ] `_headers` exists when required by the selected compression mode.
- [ ] Compression settings are documented for this build.
- [ ] Build date and Unity version are recorded.

## Demo Safety

- [ ] Demo mode is enabled.
- [ ] Mock users only.
- [ ] No real identity documents.
- [ ] No real company confidential information.
- [ ] No real KYC data.
- [ ] No payment integration.
- [ ] No government API integration.
- [ ] No production credential claims.
- [ ] No external identity-provider integration unless explicitly mocked.
- [ ] Public page says prototype / demo clearly.
- [ ] Access logs contain no sensitive data.
- [ ] Audit logs contain demo event labels only.
- [ ] No `.env`, private key, API token, export archive, or private screenshot is present in the uploaded folder.

## Cloudflare Pages Deployment

- [ ] Deployment target is Cloudflare Pages.
- [ ] Deployment method is recorded: Dashboard Direct Upload or Wrangler CLI.
- [ ] Pages project name is recorded.
- [ ] Uploaded folder is `Build/WebGL`, not the parent `Build` folder.
- [ ] Generated `pages.dev` URL is copied exactly.
- [ ] README records the demo URL, or explicitly says `TBD after successful deployment`.
- [ ] Failed deployment attempts are not documented as successful.

## Browser Verification

- [ ] Safari loads the URL.
- [ ] Chrome loads the URL.
- [ ] iPhone Safari loads the URL.
- [ ] Android Chrome or another mobile browser is tested if available.
- [ ] Loading screen completes.
- [ ] No WebAssembly MIME type errors appear.
- [ ] No compression / decompression errors appear.
- [ ] No missing `.wasm`, `.data`, `.framework.js`, or `.loader.js` asset errors appear.
- [ ] The browser console shows no production API calls.

## Gameplay Smoke Test

- [ ] FounderVerse appears after load.
- [ ] Avatar movement works.
- [ ] Camera control works.
- [ ] Founder Lounge Gate can be approached.
- [ ] Investor Room access rule can be tested.
- [ ] Builder Lab access rule can be tested.
- [ ] Admin Control Room access rule can be tested.
- [ ] `Access Granted` appears for allowed mock roles.
- [ ] `Access Denied` appears for blocked mock roles.
- [ ] Audit Log updates after gate interactions.
- [ ] Refreshing the page returns to a clean demo state or a documented saved demo state.

## Private Alpha Sharing

- [ ] Demo URL is shared privately first.
- [ ] Initial sharing group is limited to 5 to 10 trusted viewers.
- [ ] Sharing message states that the build is an MVP demo.
- [ ] Sharing message states that mock data only is used.
- [ ] Sharing message does not imply official identity issuance.
- [ ] Feedback questions focus on trust-gated room value, clarity, and next MVP priorities.

## Recommended Sharing Text

```text
FounderVerse MVP Demo is an early trust-gated virtual space prototype for verified decision makers.

This demo uses mock data only. It does not include real identity documents, KYC data, payment data, government API integration, or production identity-provider integration.

The goal is to validate whether room access based on visible verification states is understandable and valuable.

Demo URL:
TBD after successful deployment
```
