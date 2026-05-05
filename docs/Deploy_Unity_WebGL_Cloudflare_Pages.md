# FounderVerse Unity WebGL Cloudflare Pages Deployment

FounderVerse MVP Demo is distributed as a browser-playable Unity WebGL demo through Cloudflare Pages.

Position the deployed build as:

```text
FounderVerse MVP Demo
A trust-gated virtual space prototype for verified decision makers.
```

Do not present this MVP as a production identity service. Do not claim that it issues official identity documents, performs real KYC, connects to government systems, or verifies real-world legal identity.

## Production Intent

This deployment flow is for a private alpha demo URL, not a public production identity product.

Use it to validate the core experience:

1. A user opens a URL.
2. FounderVerse loads in the browser.
3. The avatar can move.
4. The user approaches role or trust gates.
5. Room access changes by demo verification level.
6. `Access Granted` or `Access Denied` appears.
7. A non-sensitive audit log records demo events.

For the first publishable slice, prioritize feasibility and reliable loading over aggressive compression or visual polish.

## Reference Documentation

- Unity WebGL build flow: https://docs.unity3d.com/2023.1/Documentation/Manual/webgl-building.html
- Unity WebGL compressed builds and server headers: https://docs.unity3d.com/2020.1/Documentation/Manual/webgl-deploying.html
- Cloudflare Pages custom headers: https://developers.cloudflare.com/pages/configuration/headers/
- Cloudflare Pages Direct Upload: https://developers.cloudflare.com/pages/get-started/direct-upload/

## 1. Open the Unity Project

Open the FounderVerse Unity project in Unity Editor.

Recommended baseline:

```text
Unity version: Use the project-pinned LTS/editor version if available.
Target platform: WebGL
Output folder: Build/WebGL
Demo name: FounderVerse MVP Demo
Cloudflare Pages project name: founderverse-demo
```

Before building, confirm that the project opens without missing packages, missing scenes, or unresolved script compilation errors. A WebGL build should not be attempted until the Editor can enter Play Mode cleanly.

## 2. Switch Build Target to WebGL

In Unity Editor:

```text
1. Open File > Build Settings.
2. Select WebGL from the Platform list.
3. Click Switch Platform.
4. Wait for Unity to reimport and reconfigure assets.
5. Confirm WebGL remains selected after the switch completes.
```

Switching platform can take time because Unity may reimport shaders, textures, plugins, and platform-specific assets.

## 3. Configure Scenes In Build

Add only the scenes required for the MVP navigation flow.

Minimum FounderVerse demo scene list:

```text
Boot Scene
Entrance Hall
Founder Lounge
Investor Room
Builder Lab
Admin Control Room
```

Recommended structure:

```text
Assets/FounderVerse/Scenes/Boot.unity
Assets/FounderVerse/Scenes/EntranceHall.unity
Assets/FounderVerse/Scenes/FounderLounge.unity
Assets/FounderVerse/Scenes/InvestorRoom.unity
Assets/FounderVerse/Scenes/BuilderLab.unity
Assets/FounderVerse/Scenes/AdminControlRoom.unity
```

Keep `Boot` first if it initializes demo data, mock users, save state, routing, or global services.

## 4. Configure WebGL Publishing Settings

Open:

```text
Edit > Project Settings > Player > WebGL > Publishing Settings
```

Stable first-demo settings:

```text
Compression Format: Disabled or Gzip
Decompression Fallback: On
Name Files As Hashes: On is acceptable
Data Caching: On is acceptable
Development Build: On for internal debug, Off for external alpha links
```

Use this safe progression:

| Stage | Compression | Decompression Fallback | Use case |
| --- | --- | --- | --- |
| Minimal | Disabled | Not needed | Fastest to reason about, larger files |
| Stable alpha | Gzip | On | Good first URL share when server header setup is uncertain |
| Production-like | Brotli | Off | Smaller downloads, requires correct Cloudflare `_headers` |

For private alpha, `Gzip` with `Decompression Fallback` enabled is a practical default. It is not the fastest possible loading path, but it reduces deployment header risk.

## 5. Build to `Build/WebGL`

In Unity:

```text
1. Open File > Build Settings.
2. Confirm WebGL is selected.
3. Confirm Scenes In Build includes the MVP scenes.
4. Click Build.
5. Select Build/WebGL as the output folder.
6. Wait for the build to finish.
```

Do not upload the parent `Build` folder. Upload the folder that directly contains `index.html`.

## 6. Confirm Build Output Files

After a successful WebGL build, confirm this shape:

```text
Build/WebGL/
  index.html
  Build/
    founderverse.loader.js
    founderverse.framework.js
    founderverse.wasm
    founderverse.data
  TemplateData/
    favicon.ico
    style.css
```

With Gzip compression, the files may look like:

```text
Build/WebGL/
  index.html
  Build/
    founderverse.loader.js
    founderverse.framework.js.gz
    founderverse.wasm.gz
    founderverse.data.gz
  TemplateData/
    ...
```

With Brotli compression, they may look like:

```text
Build/WebGL/
  index.html
  Build/
    founderverse.loader.js
    founderverse.framework.js.br
    founderverse.wasm.br
    founderverse.data.br
  TemplateData/
    ...
```

If `index.html` is missing from `Build/WebGL`, the wrong folder was selected or the build did not complete correctly.

## 7. Add a Cloudflare Pages `_headers` File

Create this file:

```text
Build/WebGL/_headers
```

Cloudflare Pages reads `_headers` from the deployed static asset directory. For this Unity build, that directory is `Build/WebGL`.

Copy-ready templates are also available in this repository:

```text
docs/templates/founderverse-webgl-headers-stable.txt
docs/templates/founderverse-webgl-headers-native-compression.txt
```

For repeatable Unity Editor or batchmode builds, use the automation guide:

```text
docs/FounderVerse_Unity_Build_Automation.md
```

After the Unity build finishes, run the deployment validator before upload:

```bash
node ./scripts/validate-founderverse-webgl.mjs --unity-project "/path/to/FounderVerseUnityProject" --webgl-build "/path/to/FounderVerseUnityProject/Build/WebGL"
```

### Stable Header Set

Use this when `Compression Format` is `Disabled`, or when `Gzip`/`Brotli` is paired with `Decompression Fallback` and Unity emits `.unityweb` assets:

```text
/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
```

### Native Gzip / Brotli Header Set

Use this when compressed `.gz` or `.br` files are served directly and `Decompression Fallback` is off:

```text
/Build/*.wasm.gz
  Content-Type: application/wasm
  Content-Encoding: gzip

/Build/*.js.gz
  Content-Type: application/javascript
  Content-Encoding: gzip

/Build/*.data.gz
  Content-Type: application/octet-stream
  Content-Encoding: gzip

/Build/*.wasm.br
  Content-Type: application/wasm
  Content-Encoding: br

/Build/*.js.br
  Content-Type: application/javascript
  Content-Encoding: br

/Build/*.data.br
  Content-Type: application/octet-stream
  Content-Encoding: br

/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
```

Do not mix native compressed delivery with missing `Content-Encoding` headers. That is a common cause of WebGL builds loading forever or failing at the WebAssembly stage.

## 8. Deploy Through Cloudflare Dashboard Direct Upload

Use this path for the first private demo because it is simple and visible.

```text
1. Log in to Cloudflare.
2. Open Workers & Pages.
3. Select Pages.
4. Create a project.
5. Choose Direct Upload / drag-and-drop upload.
6. Set Project name to founderverse-demo.
7. Upload the Build/WebGL folder, not the parent Build folder.
8. Deploy the site.
9. Copy the generated pages.dev URL.
```

Expected URL shape:

```text
https://founderverse-demo.pages.dev
```

If the project name is already taken, Cloudflare may add extra characters to the URL. Record the exact URL Cloudflare returns.

## 9. Deploy Through Wrangler CLI

Use Wrangler when you want a repeatable terminal-based deployment.

Recommended local commands:

```bash
npx wrangler login
npx wrangler pages project create founderverse-demo
npx wrangler pages deploy ./Build/WebGL --project-name founderverse-demo
```

Alternative if Wrangler is already installed globally:

```bash
wrangler login
wrangler pages project create founderverse-demo
wrangler pages deploy ./Build/WebGL --project-name founderverse-demo
```

Before deploying from automation or CI, verify credentials:

```bash
npx wrangler whoami
```

If `whoami` fails, fix Cloudflare authentication before attempting deployment. Read access to an account or project is not enough evidence that deploy permissions are available.

## 10. Capture and Record the Generated URL

After dashboard or Wrangler deployment, record:

```text
Demo name: FounderVerse MVP Demo
Cloudflare Pages project: founderverse-demo
Production URL: https://founderverse-demo.pages.dev
Deployment method: Dashboard Direct Upload or Wrangler CLI
Build source: Unity WebGL Build/WebGL
Build date:
Unity version:
Demo data mode: Mock data only
```

Add the exact URL to `README.md` only after the deployment succeeds. Do not add a fake URL as if it has been deployed.

## 11. Test the Deployed URL

Test the deployed URL on multiple environments:

```text
1. Safari on macOS
2. Chrome on macOS or Windows
3. iPhone Safari
4. Android Chrome if available
5. A low-spec or older device if available
```

Gameplay smoke test:

```text
1. Open the URL.
2. Confirm the loading screen completes.
3. Confirm FounderVerse appears.
4. Move the avatar.
5. Approach Founder Lounge Gate.
6. Confirm access changes by mock verification level.
7. Confirm Access Granted / Access Denied appears.
8. Confirm Audit Log records non-sensitive demo events.
9. Refresh the page and confirm the demo still starts cleanly.
```

Browser console checks:

```text
- No WebAssembly MIME type errors.
- No decompression or content encoding errors.
- No missing .data, .wasm, .framework.js, or .loader.js files.
- No real API endpoint calls.
- No production credential warnings.
```

## 12. Confirm Mock Data Only

Before sharing any URL, confirm:

```text
- Demo mode is enabled.
- Users are mock users only.
- No real identity documents are included.
- No real company confidential information is included.
- No real KYC data is included.
- No payment provider is connected.
- No government API is connected.
- No external identity provider is connected unless it is clearly mocked.
- Audit logs contain no sensitive personal data.
- The public-facing page clearly says prototype / demo.
```

Also inspect the built `Build/WebGL` output for accidental files such as screenshots, exports, credentials, `.env` files, API keys, or private test data.

## 13. Update README

After a successful deployment, update `README.md` with:

```markdown
## FounderVerse WebGL Demo Deployment

FounderVerse can be distributed as a Unity WebGL demo through Cloudflare Pages.

Recommended deployment flow:

1. Open the Unity project.
2. Switch Platform to WebGL.
3. Build to `Build/WebGL`.
4. Confirm `index.html`, `Build/`, and `TemplateData/` exist.
5. Add `_headers` if compressed WebGL files are used.
6. Deploy `Build/WebGL` to Cloudflare Pages.
7. Copy the generated `pages.dev` URL.
8. Share the URL privately with alpha testers.

Demo URL:

TBD after successful deployment.

Important:

This MVP uses mock data only.
It does not collect real identity documents.
It does not connect to KYC vendors, payment providers, government APIs, or external identity providers.
It only demonstrates platform-level verification states and room access rules.
```

Use `TBD after successful deployment` until the URL exists.

## 14. Share Privately With Alpha Users

First sharing target:

```text
5 to 10 trusted alpha viewers
```

Good fit:

```text
- Trusted company founders
- Entrepreneurs
- Solo business owners
- AI implementation partners
- Investor candidates
- Legal/accounting/other professional advisors
```

Safe sharing text:

```text
FounderVerse MVP Demo is an early trust-gated virtual space prototype for verified decision makers.

This demo uses mock data only. It does not include real identity documents, KYC data, payment data, government API integration, or production identity-provider integration.

The goal is to validate whether room access based on visible verification states is understandable and valuable.

Demo URL:
TBD after successful deployment
```

## Release Gate

Do not share externally until every item is complete:

```text
[ ] Unity WebGL build succeeds.
[ ] Build/WebGL/index.html exists.
[ ] Cloudflare _headers matches the compression mode.
[ ] URL opens in Safari.
[ ] URL opens in Chrome.
[ ] Mobile browser smoke test passes.
[ ] Avatar movement works.
[ ] Founder Lounge Gate works.
[ ] Access Granted / Access Denied works.
[ ] Audit Log displays mock-only events.
[ ] No real identity, KYC, company, payment, or government data is present.
[ ] README records the exact deployed URL or says TBD.
```
