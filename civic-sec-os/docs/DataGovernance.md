# Data Governance and Retention

| Dataset | Sensitivity | Retention | Lawful Basis | Notes |
|---------|-------------|-----------|--------------|-------|
| Emergency Call Metadata | Restricted | 1 year | Disaster response mandate | Mask caller ID when exporting |
| CCTV Extracts | Confidential | 30 days | Public safety ordinance | Blur faces before cross-domain release |
| OT Sensor Data | Restricted | 90 days | Critical infrastructure law | Align with NIST SP 800-82 controls |
| Threat Intel Bundles | Public | 180 days | Cooperative sharing | Use TAXII signing keys |

Retention policies are encoded as code in infrastructure modules and enforced at pipeline level.
