# Source Ingestion Plan (Primary-First)

## Priority Order
1. UN SDG / DESA
2. OHCHR treaties/UDHR corpus
3. WHO official reports and factsheets
4. World Bank official data APIs/reports
5. UNICEF datasets/reports
6. UNESCO/UIS/GEM
7. FAO SOFI
8. UN-Water
9. ILO child labour
10. UN Women

## Ingestion Pipeline
1. Register source in `sources` with organization + trust tier.
2. Pull metadata and documents into `source_documents` + object storage.
3. Parse tables/text with deterministic parsers and schema checks.
4. Create `observations` for indicators with provenance.
5. Chunk source text into `source_chunks` for retrieval.
6. Run citation-linker to map observations and claims to chunks.
7. Emit `ingestion_runs` status and `audit_logs` entries.

## Adapter Status (MVP)
- UN SDG: mock contract implemented.
- WHO UHC: mock contract implemented.
- World Bank poverty: mock contract implemented.
- UNICEF child well-being: mock contract implemented.
- UNESCO education: mock contract implemented.
- ILO child labour: mock contract implemented.

## Production Readiness Gaps
- Auth/rate-limit aware live connectors.
- Schema drift detection.
- Document OCR fallback + multilingual extraction QA.
- Automated source disagreement detection.
