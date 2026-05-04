#!/usr/bin/env bash
set -euo pipefail

PROJECT_PATH="${UNITY_PROJECT_PATH:-$(pwd)}"
OUTPUT_PATH="${FV_OUTPUT:-Build/WebGL}"
DEVELOPMENT_BUILD="${FV_DEVELOPMENT_BUILD:-false}"
COMPRESSION="${FV_COMPRESSION:-gzip}"
NATIVE_COMPRESSION_HEADERS="${FV_NATIVE_COMPRESSION_HEADERS:-false}"
METHOD="FounderVerse.BuildTools.FounderVerseWebGLBuild.BuildWebGL"

if [[ -n "${UNITY_EDITOR:-}" ]]; then
  UNITY_BIN="$UNITY_EDITOR"
elif [[ -x "/Applications/Unity/Hub/Editor/2022.3.0f1/Unity.app/Contents/MacOS/Unity" ]]; then
  UNITY_BIN="/Applications/Unity/Hub/Editor/2022.3.0f1/Unity.app/Contents/MacOS/Unity"
else
  UNITY_BIN="$(find /Applications -path "*/Unity.app/Contents/MacOS/Unity" -type f 2>/dev/null | sort -r | head -n 1 || true)"
fi

if [[ -z "${UNITY_BIN:-}" || ! -x "$UNITY_BIN" ]]; then
  echo "Unity Editor executable was not found." >&2
  echo "Set UNITY_EDITOR=/absolute/path/to/Unity.app/Contents/MacOS/Unity and rerun." >&2
  exit 1
fi

if [[ ! -f "$PROJECT_PATH/ProjectSettings/ProjectSettings.asset" ]]; then
  echo "Unity project was not found at: $PROJECT_PATH" >&2
  echo "Expected ProjectSettings/ProjectSettings.asset." >&2
  exit 1
fi

"$UNITY_BIN" \
  -batchmode \
  -quit \
  -projectPath "$PROJECT_PATH" \
  -executeMethod "$METHOD" \
  -fvOutput "$OUTPUT_PATH" \
  -fvDevelopmentBuild "$DEVELOPMENT_BUILD" \
  -fvCompression "$COMPRESSION" \
  -fvNativeCompressionHeaders "$NATIVE_COMPRESSION_HEADERS"
