# FounderVerse Deployment Status

Last checked: 2026-05-04 Asia/Tokyo

## Current Result

Deployment is not yet executable from this workspace because the Unity project and Unity WebGL build output are not present here.

This repository now contains the FounderVerse deployment documentation, distribution checklist, and Cloudflare `_headers` templates, but no detected Unity project files or `Build/WebGL/index.html`.

## Local Checks

Detected:

```text
docs/Deploy_Unity_WebGL_Cloudflare_Pages.md
docs/FounderVerse_Distribution_Checklist.md
docs/templates/founderverse-webgl-headers-stable.txt
docs/templates/founderverse-webgl-headers-native-compression.txt
tools/unity/FounderVerseWebGLBuild.cs
tools/unity/build-founderverse-webgl.sh
public/_headers
dist/_headers
wrangler.jsonc
package.json
```

Not detected:

```text
ProjectSettings/ProjectSettings.asset
ProjectSettings/EditorBuildSettings.asset
*.unity scenes
Build/WebGL/index.html
Unity Hub under /Applications
Unity Editor under /Applications
npx in PATH
```

Wrangler exists in `node_modules`, but Cloudflare authentication is not active in this environment.

Verified command result:

```text
wrangler 4.71.0
You are not authenticated. Please run `wrangler login`.
```

Repository validation completed:

```text
TypeScript import/transpile validation: passed
Vite production build: passed
Local browser preview smoke test: passed for the current Aether Atelier app
Unity build automation scaffold: added, not executed
Unity build shell wrapper syntax: passed
Unity build shell wrapper execution: blocked as expected, Unity Editor executable was not found
Unity WebGL build: not run, because Unity project files are not present
Cloudflare Pages deploy: not run, because Build/WebGL is missing and Wrangler is not authenticated
```

Preview smoke details:

```text
Preview URL: http://127.0.0.1:4173/
Page title: Aether Atelier
Visible state: settlement HUD, build controls, character inspection panel, simulation feed
Browser console warnings/errors: none captured during smoke test
```

## Next Executable Step

On the machine or folder that contains the FounderVerse Unity project:

```text
1. Open the Unity project.
2. Copy tools/unity/FounderVerseWebGLBuild.cs into Assets/Editor.
3. Run FounderVerse > Build > Validate WebGL Build Settings.
4. Build to Build/WebGL from Unity Editor or tools/unity/build-founderverse-webgl.sh.
5. Confirm Build/WebGL/_headers exists.
6. Deploy Build/WebGL through Cloudflare Pages Direct Upload or Wrangler.
7. Record the generated pages.dev URL in README.md.
```

Use the stable header template for `Disabled` compression or `Gzip/Brotli` with `Decompression Fallback` enabled:

```text
docs/templates/founderverse-webgl-headers-stable.txt
```

Use the native compression header template for direct `.gz` or `.br` serving with `Decompression Fallback` disabled:

```text
docs/templates/founderverse-webgl-headers-native-compression.txt
```

## Deployment Gate

Do not mark the demo URL as published until:

```text
[ ] Build/WebGL/index.html exists.
[ ] Build/WebGL/_headers exists when required.
[ ] Cloudflare Pages deployment succeeds.
[ ] The generated pages.dev URL opens in Safari and Chrome.
[ ] The demo uses mock data only.
```
