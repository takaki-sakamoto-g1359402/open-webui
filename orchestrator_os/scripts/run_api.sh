#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
uvicorn orchestrator_os.main:app --reload
