# Critical Infrastructure Alert Triage

1. **Ingest** – Confirm telemetry arrival via `POST /ingest/{source}` with schema validation.
2. **Contextualise** – Resolve entities and view dependencies using `GET /graph/entity/{id}`.
3. **Geospatial Impact** – Calculate heatmaps and isochrones to assess service coverage gaps.
4. **Access Review** – Verify ABAC attributes before sharing with external agencies through CDS guard.
5. **Escalation** – Execute `POST /incident/{id}/action` to assign tasks and log approvals.
