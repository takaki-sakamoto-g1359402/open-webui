#!/bin/bash
set -e

# Clone template repos
mkdir -p templates
if [ ! -d templates/pypackage ]; then
  git clone https://github.com/cookiecutter/cookiecutter-pypackage.git templates/pypackage
fi
if [ ! -d templates/vite ]; then
  git clone https://github.com/vitejs/vite.git templates/vite
fi

# Create directories
mkdir -p docs infra/terraform k8s/helm services/ingest services/graph services/api/app/routers services/analytics ui/src

# 1. Architecture diagram
cat > docs/architecture.md <<'ARCH'
# Aegis Architecture

```mermaid
graph TD
  subgraph Ingest
    Airbyte-->Kafka
    NiFi-->Kafka
  end
  subgraph Processing
    Kafka-->Spark
  end
  subgraph Storage
    Spark-->Neo4j
    Spark-->RDS
    Spark-->OpenSearch
  end
  subgraph API
    Neo4j-->FastAPI
    RDS-->FastAPI
    OpenSearch-->FastAPI
  end
  FastAPI-->UI
```
ARCH

# 2. Terraform skeleton
cat > infra/terraform/main.tf <<'TF'
terraform {
  required_version = ">= 1.6"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.region
}

module "vpc" {
  source = "terraform-aws-modules/vpc/aws"
  name   = "aegis-vpc"
  cidr   = var.vpc_cidr
}

module "rds" {
  source          = "terraform-aws-modules/rds/aws"
  engine          = "postgres"
  instance_class  = "db.t3.micro"
  name            = "aegisdb"
  username        = var.db_user
  password        = var.db_password
  subnet_ids      = module.vpc.database_subnets
  vpc_security_group_ids = [module.vpc.default_security_group_id]
}

module "eks" {
  source       = "terraform-aws-modules/eks/aws"
  cluster_name = "aegis-eks"
  subnet_ids   = module.vpc.private_subnets
  vpc_id       = module.vpc.vpc_id
}

module "msk" {
  source                 = "terraform-aws-modules/msk-kafka-cluster/aws"
  cluster_name           = "aegis-msk"
  subnet_ids             = module.vpc.private_subnets
  vpc_security_group_ids = [module.vpc.default_security_group_id]
}
TF

cat > infra/terraform/variables.tf <<'TF'
variable "region" {
  type    = string
  default = "us-east-1"
}

variable "vpc_cidr" {
  type    = string
  default = "10.0.0.0/16"
}

variable "db_user" {
  type = string
}

variable "db_password" {
  type = string
}
TF

cat > infra/terraform/outputs.tf <<'TF'
output "vpc_id" {
  value = module.vpc.vpc_id
}

output "eks_cluster_name" {
  value = module.eks.cluster_name
}
TF

# 3. Helm charts
for svc in api ingest graph analytics ui; do
  chart_dir="k8s/helm/${svc}"
  mkdir -p "$chart_dir/templates"
  cat > "$chart_dir/Chart.yaml" <<EOF
apiVersion: v2
name: ${svc}
version: 0.1.0
EOF
  cat > "$chart_dir/values.yaml" <<EOF
replicaCount: 1
image:
  repository: ${svc}
  tag: latest
EOF
  cat > "$chart_dir/templates/deployment.yaml" <<'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Chart.Name }}
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      app: {{ .Chart.Name }}
  template:
    metadata:
      labels:
        app: {{ .Chart.Name }}
    spec:
      containers:
        - name: {{ .Chart.Name }}
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          ports:
            - containerPort: 80
EOF
done

# 4. NiFi flow and Airbyte config
cat > services/ingest/nifi_flow.xml <<'XML'
<flow>
  <processor name="ConsumeKafka" />
  <processor name="ConvertRecord" />
</flow>
XML

cat > services/ingest/airbyte.yaml <<'YAML'
connections:
  - name: sample-csv
    source: csv
    destination: kafka
YAML

# 5. Neo4j service
cat > services/graph/Dockerfile <<'EOF'
FROM neo4j:5
COPY schema.cypher /docker-entrypoint-initdb.d/
COPY seed.cypher /docker-entrypoint-initdb.d/
EOF

cat > services/graph/schema.cypher <<'EOF'
CREATE CONSTRAINT person_id IF NOT EXISTS ON (p:Person) ASSERT p.id IS UNIQUE;
EOF

cat > services/graph/seed.cypher <<'EOF'
CREATE (:Person {id: 1, name: 'Alice'});
EOF

# 6. FastAPI project
cat > services/api/app/main.py <<'PY'
from fastapi import FastAPI
from .routers import entities, link, search

app = FastAPI(title="Aegis API")
app.include_router(entities.router)
app.include_router(link.router)
app.include_router(search.router)

@app.get("/health")
def health():
    return {"status": "ok"}
PY

cat > services/api/app/routers/__init__.py <<'PY'
from . import entities, link, search
__all__ = ["entities", "link", "search"]
PY

cat > services/api/app/routers/entities.py <<'PY'
from fastapi import APIRouter
router = APIRouter(prefix="/entities")

@router.get("/{entity_id}")
def get_entity(entity_id: str):
    return {"id": entity_id}
PY

cat > services/api/app/routers/link.py <<'PY'
from fastapi import APIRouter
router = APIRouter(prefix="/link")

@router.post("/")
def link_entities():
    return {"linked": True}
PY

cat > services/api/app/routers/search.py <<'PY'
from fastapi import APIRouter
router = APIRouter(prefix="/search")

@router.get("/")
def search(q: str):
    return {"query": q}
PY

# 7. PySpark jobs
cat > services/analytics/entity_resolution.py <<'PY'
from pyspark.sql import SparkSession
spark = SparkSession.builder.appName("entity-resolution").getOrCreate()
# TODO: implement checkpointed idempotent job
PY

cat > services/analytics/graph_analytics.py <<'PY'
from pyspark.sql import SparkSession
spark = SparkSession.builder.appName("graph-analytics").getOrCreate()
PY

cat > services/analytics/anomaly_detection.py <<'PY'
from pyspark.sql import SparkSession
spark = SparkSession.builder.appName("anomaly-detection").getOrCreate()
PY

# 8. React UI skeleton
cat > ui/package.json <<'EOF'
{
  "name": "aegis-ui",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "cytoscape": "^3.26.0",
    "mapbox-gl": "^2.15.0",
    "vis-timeline": "^7.7.0"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0",
    "typescript": "^5.4.0"
  }
}
EOF

cat > ui/src/App.tsx <<'EOF'
import React from 'react';
export const App = () => <div>Aegis UI</div>;
export default App;
EOF

# 9. Developer guide
cat > docs/dev-guide.md <<'EOF'
# Developer Guide

Run locally with Docker Compose:
```bash
docker compose up -d
```
EOF

# 10. Security guide
cat > docs/security.md <<'EOF'
# Security

## RBAC Matrix
| Role   | Permissions |
|--------|-------------|
| admin  | all         |
| analyst| read/write  |
| viewer | read        |

## Audit & Logging
All services emit logs to OpenSearch and traces via OpenTelemetry.

## Data Lineage
Marquez captures lineage for every job.
EOF

# Initialize git repository if not already
if [ ! -d .git ]; then
  git init
  git add .
  git commit -m "Initial Aegis scaffold"
fi

echo "Aegis scaffold complete"
