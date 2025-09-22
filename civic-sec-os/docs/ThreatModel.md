# Civic Security OS Threat Model

## Overview

The Civic Security OS aggregates municipal telemetry, citizen service queues, and threat intelligence to deliver a Gotham-style common operating picture. Major trust zones include:

1. **Field Sensors and Civic Systems** – traffic cameras, emergency dispatch, IoT, OT/SCADA segments as referenced in NIST SP 800-82.
2. **Secure Processing Zone** – Kubernetes workloads hosting ingestion, fusion, geoprocessing, policy, and audit services.
3. **Cross Domain Guard** – following UK NCSC CDS and NSA Raise-the-Bar principles to enforce one-way transfer and content disarm.
4. **Operations Center** – analyst workstations consuming COP/ops console outputs.

## Key Assets

- Citizen PII and critical infrastructure schematics.
- Incident response playbooks aligned to MITRE ATT&CK.
- Audit trails required by Japan's APPI and municipal security guidelines.

## Threat Actors

- Advanced persistent threats targeting municipal OT networks.
- Insider misuse of sensitive data.
- Supply chain compromise of third-party SaaS feeds.

## Security Controls

- Attribute-based access control (ABAC) enforced through OPA policies stored in version control.
- Kafka ingestion schemas validated before fusion; malformed data sanitized.
- Append-only, hash-chained audit logs with daily notarisation anchors.
- Privacy toolkit enabling k-anonymity, differential privacy, and synthetic data evaluation prior to analyst access.
- TAXII client/server interoperability for STIX 2.1 threat feeds.

## Abuse Cases & Mitigations

| Abuse Case | Mitigation |
|------------|------------|
| Analyst attempts to exfiltrate restricted records | ABAC denies view when clearance or location attributes do not match; CDS guard enforces unidirectional flow |
| Malicious payload delivered through data ingest | CDS sanitiser stub plus schema registry rejects unexpected fields |
| Audit log tampering | Hash chain verified at read-time; anchors notarised daily |
| Privacy breach from analytics output | Privacy toolkit and retention-as-code ensure k-anonymity/l-diversity checks before release |

## Residual Risks

- Requires integration with certified CDS hardware for production.
- Synthetic data generator should be supplemented with differential privacy budgets for large-scale releases.
- Continuous monitoring and red-teaming recommended using tests harness in `tests/`.
