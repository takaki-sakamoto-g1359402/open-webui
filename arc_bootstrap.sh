#!/usr/bin/env sh
# ARC-AGI-3 baseline one-shot bootstrap (POSIX sh)
# - 安全性: umask 077, 一時ファイル掃除, 依存/失敗時の明確なメッセージ
# - 原子性: .env を同一FS内で rename(2) により置換
# - 可搬性: POSIX準拠（bash依存なし）。pipefailは存在時のみ有効化
# - 使い方: sh arc_bootstrap.sh [--api-key=XXXX] [--game=ls20] [--agent=random]
#           [--repo=URL] [--dir=DIR] [--python=3.11]

set -eu
(set -o pipefail 2>/dev/null) || true
umask 077

LOG_PREFIX="[ARC]"
log() { printf '%s %s\n' "$LOG_PREFIX" "$*"; }
err() { printf '%s ERROR: %s\n' "$LOG_PREFIX" "$*" >&2; }
die() { err "$*"; exit 1; }

cleanup() { [ -n "${TMPFILES:-}" ] && rm -f $TMPFILES 2>/dev/null || true; }
trap cleanup EXIT INT TERM

require_cmd() { command -v "$1" >/dev/null 2>&1 || die "$1 is required but not found in PATH"; }
for c in git curl; do require_cmd "$c"; done

PATH="$HOME/.local/bin:$HOME/.cargo/bin:$PATH"

# Defaults
GAME="ls20"
AGENT="random"
API_KEY="${ARC_API_KEY:-}"
REPO_URL="https://github.com/arcprize/ARC-AGI-3-Agents.git"
REPO_DIR="ARC-AGI-3-Agents"
PY_VER="3.11"

# Args
for arg in "$@"; do
  case "$arg" in
    --api-key=*) API_KEY="${arg#*=}";;
    --game=*)    GAME="${arg#*=}";;
    --agent=*)   AGENT="${arg#*=}";;
    --repo=*)    REPO_URL="${arg#*=}";;
    --dir=*)     REPO_DIR="${arg#*=}";;
    --python=*)  PY_VER="${arg#*=}";;
    --help|-h)
      cat <<'USAGE'
Usage: sh arc_bootstrap.sh [--api-key=XXXX] [--game=ls20] [--agent=random]
                           [--repo=URL] [--dir=DIR] [--python=3.11]
Env:
  ARC_API_KEY           default API key
  UV_INSTALL_SHA256     expected SHA256 of uv installer (optional)
USAGE
      exit 0
      ;;
  esac
done

install_uv() {
  if command -v uv >/dev/null 2>&1; then
    log "uv found: $(uv --version 2>/dev/null || echo present)"
    return 0
  fi
  log "Installing uv..."
  tmp="$(mktemp)"; TMPFILES="${TMPFILES:-} $tmp"
  curl -fsSL https://astral.sh/uv/install.sh -o "$tmp" || die "failed to download uv installer"
  if [ -n "${UV_INSTALL_SHA256:-}" ] && command -v openssl >/dev/null 2>&1; then
    sum="$(openssl dgst -sha256 "$tmp" 2>/dev/null | awk '{print $2}')"
    [ "$sum" = "$UV_INSTALL_SHA256" ] || die "uv installer SHA256 mismatch"
  fi
  sh "$tmp" || die "uv installer failed"
  hash -r 2>/dev/null || true
  command -v uv >/dev/null 2>&1 || die "uv not found after installation"
  log "uv installed: $(uv --version 2>/dev/null || echo present)"
}

ensure_repo() {
  if [ -d "$REPO_DIR/.git" ]; then
    log "Repo exists. Updating..."
    git -C "$REPO_DIR" fetch --depth=1 origin || true
    git -C "$REPO_DIR" pull --ff-only || true
  else
    log "Cloning $REPO_URL ..."
    git clone --depth=1 "$REPO_URL" "$REPO_DIR"
  fi
}

ensure_env() {
  cd "$REPO_DIR"
  if [ ! -f ".env" ]; then
    log "Creating .env from .env-example (if present)"
    if [ -f ".env-example" ]; then
      cp ".env-example" ".env"
    else
      : > ".env"
    fi
  fi
  if [ -n "$API_KEY" ]; then
    # create temp file in same dir for atomic replace (rename(2))
    tmpenv="$(mktemp .env.tmp.XXXXXX 2>/dev/null || printf '%s' '.env.tmp.'$$)"
    : > "$tmpenv"
    TMPFILES="${TMPFILES:+$TMPFILES }$tmpenv"
    { grep -v '^ARC_API_KEY=' .env 2>/dev/null || true; printf 'ARC_API_KEY=%s\n' "$API_KEY"; } > "$tmpenv"
    chmod 600 "$tmpenv" 2>/dev/null || true
    mv -f -- "$tmpenv" .env
  else
    if ! grep -q '^ARC_API_KEY=' .env 2>/dev/null; then
      printf 'ARC_API_KEY=TODO\n' >> .env
      log "ARC_API_KEY not provided. Edit .env or rerun with --api-key=<ARC_API_KEY>."
    fi
  fi
}

sync_env() {
  log "Syncing Python environment with uv..."
  if ! uv sync; then
    log "uv sync failed; ensuring Python $PY_VER via uv and retrying..."
    uv python install "$PY_VER" || die "failed to install Python $PY_VER"
    uv python pin "$PY_VER" || true
    uv sync || die "uv sync failed after Python install"
  fi
}

run_baseline() {
  log "Running baseline agent: agent=$AGENT game=$GAME"
  out="$(mktemp)"; TMPFILES="${TMPFILES:-} $out"
  if uv run main.py --agent="$AGENT" --game="$GAME" | tee "$out"; then
    url="$(grep -Eo 'https?://[^ ]*(scorecard|replay)[^ ]*' "$out" | head -1 || true)"
    [ -n "$url" ] && printf 'Scorecard: %s\n' "$url"
    log "Done."
  else
    cat "$out"
    die "baseline run failed"
  fi
}

install_uv
ensure_repo
ensure_env
sync_env
run_baseline
