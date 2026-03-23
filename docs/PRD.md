# Heaven Blueprint Atlas — Product Requirements Document (PRD)

## 1. Purpose
Heaven Blueprint Atlas turns the abstract goal of a humane civilization into an evidence-linked intelligence system grounded in **primary sources first**. The product helps policymakers, civil society, journalists, and researchers evaluate whether human dignity is being materially protected country-by-country.

## 2. Product Principles
1. Primary source priority is mandatory (UN, OHCHR, WHO, World Bank, UNICEF, UNESCO, FAO, UN-Water, ILO, UN Women).
2. Every metric is traceable to source and transformation.
3. No fabricated values, dates, or citations.
4. Missing data lowers confidence; it never gets silently imputed as fact.
5. Distinguish observed facts, modeled estimates, and normative judgments.

## 3. Users and Jobs-to-be-Done
- **Policy analyst**: compare a country’s progress across dignity pillars and identify intervention priorities.
- **Investigative reporter**: verify claims with direct source links and versioned updates.
- **Civil society advocate**: track deterioration in child safety, poverty, and institutional accountability.
- **Administrator/data steward**: maintain source registry, ingestion quality, and audit trails.

## 4. Scope (MVP)
### Included
- Home dashboard (global cards, top risks, top improvers, latest source updates).
- Country detail page (Heaven Score, pillar subscores, trends, evidence cards, methodology panel).
- Source explorer (filter by organization, geography, year, pillar).
- Explainability view per score component.
- AI analyst mode with retrieval-backed answers and confidence labels.
- Scenario lab with clearly marked inferred estimates.
- Admin ingestion dashboard (registry, runs, logs, failures).

### Excluded (post-MVP)
- Live production connectors for all providers.
- Fine-grained user permissions/SSO.
- Real-time streaming updates.

## 5. Functional Requirements
- Score range 0–100 with configurable pillar weights.
- Reproducible calculation from observations + methodology version.
- Citation graph from answer/score -> claim -> chunk -> source document.
- Retrieval favors newest relevant official source, with historical diff mode.
- Full audit log for ingestion, extraction, scoring, and AI responses.

## 6. Non-Functional Requirements
- Deterministic score recomputation.
- Schema validation on all ingested records.
- p95 API latency < 500ms for scorecard read endpoints on seed dataset.
- Security: signed source file checksums, append-only audit logs.
- Observability: ingestion success/failure rates, stale-source alerts.

## 7. Success Metrics
- 100% displayed values have citations and source links.
- 0 tolerance for uncited generated claims.
- >95% ingestion contract validation pass rate for supported connectors.
- Median analyst task time (country comparison) reduced by 50% vs manual lookup.

## 8. Release Plan
- Phase 1: schema, scoring, mocked adapters, dashboard + country page.
- Phase 2: retrieval index and AI analyst with citation enforcement.
- Phase 3: scenario lab, explainability depth, stronger audits.
- Phase 4: UX hardening, deployment, security/perf tuning.
