# System Architecture

## Mermaid Diagram
```mermaid
flowchart TD
  A[Primary Sources\nUN/WHO/WB/UNICEF/UNESCO/ILO] --> B[Ingestion Connectors]
  B --> C[Validation + Parsing]
  C --> D[(PostgreSQL)]
  C --> E[(Object Storage\nsource files)]
  C --> F[(Vector Index\nsource chunks)]
  D --> G[Scoring Engine]
  D --> H[FastAPI Service]
  F --> H
  G --> H
  H --> I[Next.js Web App]
  H --> J[AI Analyst Mode\nResponses API]
  J --> F
  J --> D
  H --> K[Admin Ingestion Dashboard]
  D --> L[Audit Logs + Provenance]
```

## Components
- **apps/web**: Next.js dashboard, country detail, source explorer, explainability, scenario lab, admin.
- **apps/api**: FastAPI endpoints for scores, sources, ingestion status, retrieval QA.
- **packages/data-model**: canonical schemas and SQL definitions.
- **packages/ingestion**: adapter contracts and provider-specific connectors.
- **packages/scoring**: deterministic score calculations + confidence model.
- **packages/ai**: retrieval-grounded answer orchestration for GPT-5.4 Responses API.
- **tests**: scoring and citation-integrity tests.
