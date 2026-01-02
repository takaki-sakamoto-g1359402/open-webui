# Threat Model - UGW FounderWorld / DealOS PoC

## Attack Surface
- OPA policy API exposure.
- Sybil identities (multiple accounts per human).
- Key compromise (audit signing keys, oracle signing keys).
- Insider threats (admins abusing export privileges).
- Leakage via evidence exports.
- Supply-chain risks (dependency vulnerabilities).
- Side-channels (timing and metadata leaks).

## Trust Assumptions
- Trust registry and oracle authorities are honest and available.
- Keystore storage is protected at rest.
- OPA policy bundle is trusted and immutable.

## Mitigations
- Default-deny policies with explicit allow rules.
- Separation of duties (admin vs auditor vs participant roles).
- PoP + VC lifecycle enforcement with revocation and expiry checks.
- Audit logs are append-only, hash-chained, and checkpoint-signed.
- Evidence exports exclude raw confidential data unless explicitly permitted.
- Rate limiting, request size limits, and strict path validation.
- SBOM and vulnerability scans integrated in CI (pip-audit, bandit).

## Known Limitations
- PoP and oracle integrations are stubbed for the PoC.
- Keystore security is minimal and should be replaced with HSM/KMS.
- Performance overhead for audit integrity checks is not optimized.
- OPA is single-instance; HA and policy rollout not implemented.
