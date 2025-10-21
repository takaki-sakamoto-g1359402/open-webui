#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$PROJECT_ROOT"

source .venv/bin/activate
export UVICORN_RELOAD_DIR=$PROJECT_ROOT
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
