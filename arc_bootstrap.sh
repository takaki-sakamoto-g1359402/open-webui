#!/usr/bin/env sh
# ARC-AGI-3 baseline agent bootstrap script

# Fail fast and be safe
set -u
if set -o pipefail 2>/dev/null; then
  set -o pipefail
fi
set -e

export PATH="${HOME}/.local/bin:${HOME}/.cargo/bin:${PATH}"

log() { printf '[ARC] %s\n' "$*"; }

# Dependency check
for cmd in git curl; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    log "$cmd is required. Install it via your package manager (e.g., 'brew install $cmd' or 'apt install $cmd') and rerun."
    exit 1
  fi
done

# Install uv if missing
if ! command -v uv >/dev/null 2>&1; then
  log "Installing uv..."
  curl -LsSf https://astral.sh/uv/install.sh | sh
  export PATH="${HOME}/.local/bin:${HOME}/.cargo/bin:${PATH}"
fi

if ! command -v uv >/dev/null 2>&1; then
  log "uv not found. Make sure it is on your PATH."
  exit 1
fi

REPO_DIR="ARC-AGI-3-Agents"

# Clone repo if needed
if [ ! -d "$REPO_DIR" ]; then
  log "Cloning ARC-AGI-3-Agents..."
  git clone https://github.com/arcprize/ARC-AGI-3-Agents.git "$REPO_DIR"
fi

cd "$REPO_DIR"

# Sync dependencies
log "Syncing dependencies with uv..."
if ! uv sync; then
  log "uv sync failed. Installing and pinning Python 3.11..."
  uv python install 3.11
  uv python pin 3.11
  uv sync
fi

# Setup .env
if [ ! -f .env ]; then
  log "Creating .env from example..."
  cp .env-example .env
fi

API_KEY="${ARC_API_KEY:-}"
for arg in "$@"; do
  case "$arg" in
    --api-key=*)
      API_KEY="${arg#*=}"
      ;;
  esac
done

tmpfile=$(mktemp)

if [ -n "$API_KEY" ]; then
  log "Writing ARC_API_KEY to .env..."
  grep -v '^ARC_API_KEY=' .env > "$tmpfile"
  printf 'ARC_API_KEY=%s\n' "$API_KEY" >> "$tmpfile"
else
  grep -v '^ARC_API_KEY=' .env > "$tmpfile"
  printf 'ARC_API_KEY=TODO\n' >> "$tmpfile"
  log "ARC_API_KEY not provided. Edit .env or rerun with --api-key=<ARC_API_KEY>."
fi
mv "$tmpfile" .env

# Run agent
log "Running baseline agent..."
if ! output=$(uv run main.py --agent=random --game=ls20 2>&1); then
  printf '%s\n' "$output"
  log "Baseline agent run failed."
  exit 1
fi
printf '%s\n' "$output"

scorecard_url=$(printf '%s\n' "$output" | \
  awk '{for(i=1;i<=NF;i++){if($i ~ /https?:\/\/[^ ]*(scorecard|replay)[^ ]*/){print $i; exit}}}')
if [ -n "$scorecard_url" ]; then
  printf 'Scorecard: %s\n' "$scorecard_url"
fi

