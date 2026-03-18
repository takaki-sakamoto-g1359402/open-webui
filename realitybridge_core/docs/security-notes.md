# Security notes

## Current trust boundaries

- JWT secret management is environment-driven.
- Bootstrap admin is for development and controlled environments only.
- Physical execution is blocked by config defaults.
- Sensitive tasks are denied by default.
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
