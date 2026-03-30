#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$PROJECT_ROOT"

python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

if [ ! -f .env ]; then
  cp .env.sample .env
fi

python -c "from app import init_db; init_db()"

echo "Environment ready. Activate with 'source .venv/bin/activate'"
echo "Run development server with 'bash scripts/dev_run.sh'"
