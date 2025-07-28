#!/bin/bash
set -e

# Create directories
mkdir -p docs infra/terraform/aws infra/terraform/cloudflare infra/terraform/ipfs \
         k8s/helm/narrative k8s/helm/graph k8s/helm/web \
         services/narrative services/graph engine/unity \
         web/ui data/samples

# docs
cat <<'ARCH' > docs/architecture.md
# Infinite Chronicle Architecture

```mermaid
graph TD
    Player -->|Edits| LoreGraph
    LoreGraph --> NarrativeEngine
    NarrativeEngine -->|Shard updates| LoreGraph
    LoreGraph --> WebUI
    WebUI -->|Real-time| Player
```
ARCH

cat <<'MOD' > docs/modding.md
# Modding Infinite Chronicle

Placeholder instructions for adding rulesets and custom shards.
MOD

cat <<'SEC' > docs/security.md
# Security and Moderation

Placeholder for anti-griefing and content moderation pipeline.
SEC

# infra/terraform placeholders
echo "# AWS Terraform" > infra/terraform/aws/main.tf
echo "# Cloudflare Workers Terraform" > infra/terraform/cloudflare/main.tf
echo "# IPFS Cluster Terraform" > infra/terraform/ipfs/main.tf

# k8s/helm placeholders
for svc in narrative graph web; do
  mkdir -p k8s/helm/$svc
  cat <<EOF_HELM > k8s/helm/$svc/Chart.yaml
apiVersion: v2
name: $svc
version: 0.1.0
EOF_HELM
done

# services/narrative
cat <<'NAR' > services/narrative/main.py
from fastapi import FastAPI

app = FastAPI(title="Infinite Chronicle Narrative Service")

@app.get("/health")
async def health():
    return {"status": "ok"}
NAR

touch services/narrative/__init__.py

# services/graph
cat <<'GRAPH' > services/graph/main.py
# Placeholder GraphQL server for Neo4j-backed lore graph
GRAPH

touch services/graph/__init__.py

# engine/unity placeholder
mkdir -p engine/unity/Assets
cat <<'UNITY' > engine/unity/README.md
Unity project placeholder (URP)
UNITY

# web/ui placeholder
cat <<'PKG' > web/ui/package.json
{
  "name": "infinite-chronicle-ui",
  "version": "0.1.0",
  "private": true
}
PKG

touch web/ui/README.md

echo "# Placeholder NPC shards" > data/samples/npcs.yaml
echo "# Placeholder location shards" > data/samples/locations.yaml

git init
git add .
git commit -m "Initial scaffold for Infinite Chronicle"

echo "Infinite Chronicle scaffold complete"
