# FounderVerse Unity Build Automation

This repository includes a drop-in Unity Editor build script for producing FounderVerse WebGL alpha builds.

## Files

```text
tools/unity/FounderVerseWebGLBuild.cs
tools/unity/build-founderverse-webgl.sh
docs/templates/founderverse-webgl-headers-stable.txt
docs/templates/founderverse-webgl-headers-native-compression.txt
```

## Install Into a Unity Project

Copy the Editor script into the Unity project:

```text
Assets/Editor/FounderVerseWebGLBuild.cs
```

Unity only compiles editor automation from an `Editor` folder, so keep the copied file under `Assets/Editor`.

## Build From Unity Editor

After the script compiles, Unity adds these menu items:

```text
FounderVerse > Build > Validate WebGL Build Settings
FounderVerse > Build > Write Cloudflare Headers Only
FounderVerse > Build > WebGL Alpha Build
```

Use `Validate WebGL Build Settings` first. It checks enabled scenes and logs the active WebGL publishing settings.

## Build From Terminal

From the Unity project root:

```bash
UNITY_EDITOR="/Applications/Unity/Hub/Editor/<version>/Unity.app/Contents/MacOS/Unity" \
/Users/sakamototakaki/Documents/New\ project/tools/unity/build-founderverse-webgl.sh
```

Optional environment variables:

```bash
UNITY_PROJECT_PATH="/path/to/FounderVerseUnityProject"
FV_OUTPUT="Build/WebGL"
FV_DEVELOPMENT_BUILD="false"
FV_COMPRESSION="gzip"
FV_NATIVE_COMPRESSION_HEADERS="false"
```

Recommended first alpha settings:

```text
FV_COMPRESSION=gzip
FV_NATIVE_COMPRESSION_HEADERS=false
```

This enables Unity decompression fallback and writes the stable Cloudflare `_headers` file.

## Native Compression Mode

For production-like compressed delivery:

```bash
FV_COMPRESSION="brotli" \
FV_NATIVE_COMPRESSION_HEADERS="true" \
/Users/sakamototakaki/Documents/New\ project/tools/unity/build-founderverse-webgl.sh
```

This writes Cloudflare headers for `.br` and `.gz` files. Use this only after confirming the deployed URL loads in Safari, Chrome, and mobile browsers.

## Output

Expected successful output:

```text
Build/WebGL/index.html
Build/WebGL/Build/
Build/WebGL/TemplateData/
Build/WebGL/_headers
```

Upload `Build/WebGL`, not the parent `Build` folder, to Cloudflare Pages Direct Upload.

## Validate Before Upload

After a Unity build finishes, run:

```bash
node ./scripts/validate-founderverse-webgl.mjs \
  --unity-project "/path/to/FounderVerseUnityProject" \
  --webgl-build "/path/to/FounderVerseUnityProject/Build/WebGL"
```

For local status reporting without failing when the Unity project is not present yet:

```bash
node ./scripts/validate-founderverse-webgl.mjs --warn-only --check-wrangler-auth --isolated-wrangler-home
```

The validator checks Unity project markers, WebGL output files, Cloudflare `_headers`, compressed asset headers, obvious sensitive files, Unity Editor availability, and optional Wrangler authentication.

## Current Limitation

This workspace does not currently contain the Unity project or Unity Editor executable, so the automation is prepared but not executed here.
