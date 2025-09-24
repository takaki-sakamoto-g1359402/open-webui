# Ransomware Response Playbook

Aligned with MITRE ATT&CK (TA0040 Impact, TA0009 Collection).

1. **Detection** – Confirm ransomware indicators via TAXII feed correlation and anomaly detectors (`libs/models`).
2. **Containment** – Use ops console workflow to isolate affected hosts. Enforce ABAC `approve` action for executives with delegated authority.
3. **Eradication** – Coordinate with OT response team per NIST SP 800-82 guidance.
4. **Recovery** – Restore from known-good backups; verify CDS guard for outbound reports.
5. **Post-Incident** – Update threat intel bundles and audit `who-saw-what` via `services/audit` logs.
