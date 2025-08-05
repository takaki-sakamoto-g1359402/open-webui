#!/usr/bin/env bash
set -euo pipefail

# Create directories
mkdir -p docs infra/terraform k8s/helm services/knowledge services/loop services/decision dashboard data/samples
mkdir -p k8s/helm/{knowledge,loop,decision,dashboard}

# Docs placeholders
cat <<'EOM' > docs/architecture.md
# Architecture

```mermaid
graph TD
    A[Component Diagram Placeholder]
```
EOM

cat <<'EOM' > docs/kpi.md
# KPIs

- social_min
- eco_max
- pareto_ok%
EOM

cat <<'EOM' > docs/security.md
# Security Strategy

RBAC, zero-trust, audit-ledger strategy.
EOM

# Infra placeholder
cat <<'EOM' > infra/terraform/main.tf
# Terraform configuration placeholder
EOM

# Helm chart placeholders
for svc in knowledge loop decision dashboard; do
  chart_dir="k8s/helm/$svc"
  mkdir -p "$chart_dir/templates"
  cat <<'CHART' > "$chart_dir/Chart.yaml"
apiVersion: v2
name: zsp-CHARTNAME
version: 0.1.0
CHART
  cat <<'DEP' > "$chart_dir/templates/deployment.yaml"
# Kubernetes deployment placeholder
DEP
done

# Service placeholders
cat <<'EOM' > services/knowledge/README.md
# Knowledge Service

CKAN + GraphQL API placeholder.
EOM

cat <<'EOM' > services/loop/README.md
# Loop Service

Material-flow tracker placeholder.
EOM

cat <<'EOM' > services/decision/README.md
# Decision Service

Multi-objective optimizer placeholder.
EOM

# Dashboard placeholder
cat <<'EOM' > dashboard/README.md
# Dashboard

React + Vite app placeholder.
EOM

# Sample data script placeholder
cat <<'EOM' > data/samples/README.md
# Sample Data

Faker scripts placeholder.
EOM

# KPI placeholder, etc.

# Apache license
cat <<'EOM' > LICENSE
Apache License 2.0 placeholder
EOM

# Initialize git repo if none exists
if [ ! -d .git ]; then
  git init
  git add .
  git commit -m "Initial ZSP scaffold"
fi

echo "ZSP scaffold complete"

