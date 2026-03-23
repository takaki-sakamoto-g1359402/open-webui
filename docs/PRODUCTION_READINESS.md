# Production Readiness Checklist

## Completed in MVP
- Monorepo scaffold with web + API + shared packages.
- Transparent scoring with configurable weights and confidence separation.
- Mock source adapters with explicit provider contracts.
- Evidence-first UI pages with source links.
- Tests for scoring determinism and citation integrity constraints.

## Remaining Before Production
1. **Live data connectors**
   - Replace mocked adapter payloads with authenticated official APIs/files.
   - Add retries, backoff, and idempotent checkpoints.
2. **Database migrations**
   - Promote SQL schema to migration tool (Alembic/Prisma).
   - Add indexes for large `observations` and `source_chunks` tables.
3. **Vector retrieval hardening**
   - Introduce reranking and deduplication.
   - Add freshness weighting and disagreement surfaces.
4. **Security**
   - Signed ingestion artifacts, secrets vault, RBAC.
5. **Quality controls**
   - Human review queue tooling for ambiguous/unverified claims.
   - Contract tests against upstream schemas.
6. **Operations**
   - CI/CD, backup/restore, SLOs, telemetry dashboards.
7. **Policy governance**
   - Methodology change control board and versioned approval workflow.
