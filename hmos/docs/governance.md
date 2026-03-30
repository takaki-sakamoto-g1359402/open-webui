# Governance Model

## Risk Levels
- **Risk0**: read-only; no side effects.
- **Risk1**: internal state changes only.
- **Risk2**: external side effects; **requires approval artifact**.
- **Risk3**: irreversible actions, money movement, credential/PII export; **disallowed in MVP**.

## Data Classification
- Public / Internal / Confidential / Secret.
- Secrets must not be stored in plaintext in SQLite/Postgres; MVP uses environment variables only.

## Approval Artifacts
Risk2 steps require approval artifacts stored in the database. Artifacts include:
- Run ID, Step ID
- Action summary
- Allowlisted destination
- Payload hash

## Kill-Switch
A global kill-switch halts new step execution and connector calls immediately.

## Audit Hash Chain
Each AuditEvent includes `prev_hash` and `event_hash` with canonical JSON hashing:
`event_hash = SHA-256(canonical_json(event_fields_without_hashes) + prev_hash)`

## External HTTP Safety
- Allowlist required
- Idempotency key required
- Safe logging with no secrets or raw request bodies
