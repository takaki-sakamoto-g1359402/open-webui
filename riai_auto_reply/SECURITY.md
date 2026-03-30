# Security Overview

Riai Auto-Reply Agent is designed for local, policy-restricted operation. This document summarizes the principal security considerations and mitigations.

## Threat model

| Threat | Description | Mitigation |
| --- | --- | --- |
| Credential leakage | Secrets embedded in requests or logs could leak outside the system. | Structured JSON logging with redaction ensures tokens are masked. `.env` is excluded from version control. |
| Unauthorized auto-send | A spoofed sender or risky message may trigger unintended delivery. | Policy gate enforces known-contact checks, risk threshold (<40), forbidden keyword scanning, and attachment rejection before auto-sending. |
| API abuse | Excessive or malformed LLM calls may expose tokens or cause denial-of-service. | LLM wrapper adds retry with exponential backoff, timeouts, and redacted logging of prompts. |
| Data tampering | Manual edits to the SQLite DB could break audit trails. | Stored prompt/draft hashes allow operators to detect modifications during audits. |
| Replay attacks | Slack requests may be replayed to trigger duplicate processing. | Slack signature verification ensures authenticity; timestamps allow further hardening if needed. |

## Secrets management

- Populate secrets only in `.env` or the environment injected by your orchestrator.
- Rotate OpenAI and Slack credentials at least quarterly or after any suspected breach.
- `DRY_RUN=true` by default prevents external traffic while validating new secrets.

## Logging & PII handling

- Logs are emitted in JSON and designed for ingestion by SIEM pipelines.
- PII within message bodies is retained only as required for drafting and auditing; consider enabling database encryption in production.
- When exporting logs, scrub or aggregate personal identifiers whenever feasible.

## Hardening recommendations

- Place the FastAPI app behind an authenticating reverse proxy (e.g., OAuth2 proxy) for admin routes.
- Enforce HTTPS/TLS termination for all ingress traffic.
- Add rate limiting on `/webhook/slack` using your gateway to mitigate abuse.
- Configure filesystem and database backups with encryption-at-rest.
- Monitor for anomalies in send logs; unexpected manual approvals should be investigated.
