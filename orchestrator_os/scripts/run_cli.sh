#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
python -m orchestrator_os.cli "$@"
