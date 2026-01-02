#!/usr/bin/env bash
set -euo pipefail

cyclonedx-py -r -i ugw_poc/requirements.txt -o ugw_poc/sbom.xml
