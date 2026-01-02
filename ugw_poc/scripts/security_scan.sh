#!/usr/bin/env bash
set -euo pipefail

pip-audit -r ugw_poc/requirements.txt
bandit -r ugw_poc/ugw -ll
