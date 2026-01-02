from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    app_name: str = "UGW FounderWorld PoC"
    db_path: str = os.getenv("UGW_DB_PATH", "./data/app.db")
    audit_db_path: str = os.getenv("UGW_AUDIT_DB_PATH", "./data/audit.db")
    audit_key_path: str = os.getenv("UGW_AUDIT_KEY_PATH", "./keystore/audit_keys.json")
    encryption_key_path: str = os.getenv("UGW_ENCRYPTION_KEY_PATH", "./keystore/encryption.key")
    opa_url: str = os.getenv("UGW_OPA_URL", "http://opa:8181")
    opa_token: str = os.getenv("UGW_OPA_TOKEN", "dev-opa-token")
    oracle_key_path: str = os.getenv("UGW_ORACLE_KEY_PATH", "./keystore/oracle_keys.json")
    rate_limit_per_minute: int = int(os.getenv("UGW_RATE_LIMIT_PER_MIN", "30"))
    request_max_bytes: int = int(os.getenv("UGW_MAX_REQUEST_BYTES", "1000000"))
    merkle_checkpoint_interval: int = int(os.getenv("UGW_MERKLE_INTERVAL", "5"))
    artifact_store: str = os.getenv("UGW_ARTIFACT_STORE", "./artifact_store")
    evidence_store: str = os.getenv("UGW_EVIDENCE_STORE", "./evidence")
    trusted_path_prefixes: tuple[str, ...] = (
        "/api",
    )


settings = Settings()
