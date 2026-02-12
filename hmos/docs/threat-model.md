# Threat Model (MVP)

## Misuse Risks
1. **Unauthorized external actions** (fraud / data exfiltration)
2. **Path traversal and filesystem abuse**
3. **Replay or duplicate side effects**
4. **Silent side effects (unlogged external calls)**
5. **Kill-switch bypass**

## Mitigations
- Risk-based policy with explicit Risk2 approvals and Risk3 denial.
- File system sandbox with normalized path resolution.
- Idempotency key enforcement with server-side result caching.
- Safe logging rules (no secrets, no auth headers).
- Global kill-switch enforced before step execution.
- Deterministic audit hash chain for tamper-evidence.
