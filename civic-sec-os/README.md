# Civic Security OS

A minimal, production-grade reference implementation of a civic security operating system for Japanese municipal use cases. The project combines a common operating picture, graph fusion, geospatial analytics, cross domain protections, and privacy-preserving analytics aligned with APPI and EU AI Act high-risk expectations.

## Repository Layout

```
civic-sec-os/
  apps/
    cop-web/         # Next.js COP with geospatial layers
    ops-console/     # Incident workflows and response boards
  services/
    ingestor/        # Streaming ingest facade with schema registry hooks
    fusion/          # Entity resolution and graph builder
    geoprocess/      # Geospatial analytics utilities
    cds-gateway/     # Cross Domain Solution guard stubs
    policy/          # OPA-backed ABAC policies and PDP helpers
    audit/           # Hash-chained audit trail service
    stix-taxii/      # Threat intel interop helpers
  libs/
    privacy/         # Privacy preserving analytics
    models/          # Explainable anomaly and forecasting models
  infra/             # Terraform, Kubernetes, CI/CD
  docs/              # Governance, DPIA, runbooks, threat models
  tests/             # End-to-end, chaos, red-team harnesses
```

## Quickstart

1. **Install dependencies**
   - Python 3.10+
   - Node.js 18+ (for the Next.js applications)
   - [`opa`](https://www.openpolicyagent.org/docs/latest/) CLI for policy testing (optional but recommended)

2. **Run unit tests**

```bash
pytest civic-sec-os/tests
```

3. **Generate synthetic demo data and simulate an incident**

```bash
(cd civic-sec-os && make demo)
```

The demo script performs the following:

- Generates synthetic events using the privacy toolkit
- Ingests them through the ingest facade and stores normalized entities
- Resolves entities and builds a graph view
- Computes a geospatial cluster and isochrone sample
- Evaluates access decisions using the OPA-aligned ABAC policy
- Writes tamper-evident audit entries that can be verified

4. **Launch the Common Operating Picture**

The `apps/cop-web` folder contains a Next.js application with map overlays configured for OGC/GeoJSON layers. Use `npm install && npm run dev` to start a local development server (requires MapLibre credentials or local tiles).

## Security & Compliance Features

- Attribute- and role-based access control encoded as OPA Rego policies with regression tests.
- Append-only, hash chained audit log with daily notarization hooks.
- Data catalog schema capturing sensitivity, retention, and lawful basis metadata.
- Cross Domain Solution guard stub simulating one-way transfer with content disarm interface.
- Privacy toolkit implementing k-anonymity, l-diversity, differential privacy, and synthetic data validation.
- Threat intelligence utilities for STIX/TAXII 2.1 interoperability and ATT&CK technique mapping.

## Governance Artifacts

- `docs/DPIA-Template.md` aligns with Japan's APPI guidance and EU AI Act high-risk system expectations.
- `docs/ThreatModel.md` summarises trust boundaries referencing NIST SP 800-53/82, UK NCSC CDS principles, and NSA Raise-the-Bar.
- `docs/Runbooks/` include playbooks for ransomware response and critical infrastructure alert triage referencing MITRE ATT&CK.

## Infrastructure

- Terraform configuration for a hardened development Kubernetes cluster leveraging sealed secrets and workload identity.
- Kubernetes manifests for service deployment, network policies, and audit storage.
- GitHub Actions workflow covering linting, typing, unit tests, IaC scans, SAST, and license checks.

## Demo Constraints

This reference focuses on architecture and guardrails. Production deployments should integrate managed Kafka, dedicated CDS hardware, accredited sanitisation tools, and full observability per municipal SOC requirements.
