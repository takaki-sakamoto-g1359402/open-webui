# Security notes

## Current trust boundaries

- JWT secret management is environment-driven.
- Bootstrap admin is for development and controlled environments only, and requires an explicit enable flag.
- Database schema ownership belongs to Alembic migrations rather than implicit runtime table creation.
- Physical execution is blocked by config defaults.
- Sensitive tasks are denied by default.
- Device action requests go through policy evaluation before any bridge execution attempt.
- Audit data is mutable by database operators in this iteration.

## Intentionally deferred hardening

- passkeys / WebAuthn
- verifiable credentials
- external policy engine integration
- hardware-backed signing for approvals
- tamper-evident audit ledger
- fine-grained ABAC / ReBAC
- secret rotation automation
- mTLS between components
