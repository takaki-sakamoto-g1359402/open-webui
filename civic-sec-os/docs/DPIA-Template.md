# Data Protection Impact Assessment Template

Aligned with Japan's Act on the Protection of Personal Information (APPI) and EU AI Act expectations for high-risk civic systems.

## 1. Project Overview
- **System Name:** Civic Security OS
- **Controller:** Municipal Security Operations Center
- **Purpose:** Provide real-time common operating picture, incident response workflows, and privacy-preserving analytics.

## 2. Data Inventory
- Catalogue all datasets with:
  - Data source (e.g., emergency call logs, IoT sensors, citizen registries)
  - Sensitivity level (public/restricted/confidential/secret)
  - Lawful basis and retention schedule
  - Data subjects and volume

## 3. Processing Description
- Streaming ingestion via Kafka facade with schema registry enforcement.
- Entity resolution and graph fusion for operational dependencies.
- Geospatial processing for clusters, heatmaps, and isochrones.
- Threat intelligence exchange using STIX/TAXII 2.1.

## 4. Risk Assessment
- **Confidentiality:** Evaluate ABAC policies, CDS guard, and audit chain.
- **Integrity:** Schema validation, audit hash chains, OPA policy tests.
- **Availability:** Kubernetes resilience, chaos testing harness.
- **AI/Analytics Risks:** Document privacy budget, k-anonymity checks, synthetic data evaluation (KS test, privacy risk score).

## 5. Safeguards
- OPA-governed ABAC with immutable audit logging for every access decision.
- Differential privacy functions for aggregate analytics.
- Content disarm pipeline to strip active content before cross-domain release.
- Sealed secrets and workload identity for infrastructure credentials.

## 6. Stakeholder Consultation
- Information Security Office
- Privacy Officer / DPO
- Municipal Emergency Management leadership

## 7. Residual Risk & Approval
- Summarise outstanding risks and mitigation roadmap.
- Obtain approvals from DPO and executive sponsor.

## 8. AI Act Logging Checklist
- Record model version, training data provenance, evaluation metrics, and explanations for automated decisions.
- Capture who accessed AI outputs, for what purpose, and justification (linked to audit trail).
