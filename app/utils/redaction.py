from __future__ import annotations

import hashlib
import json
import re
from typing import Any

PII_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("email", re.compile(r"([a-zA-Z0-9_.+-]+)@([a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)")),
    ("phone", re.compile(r"\+?\d[\d\-\s]{7,}\d")),
]

SENSITIVE_KEYS = {"email", "phone", "address", "ssn", "password", "token", "secret", "otp"}


def hash_payload(payload: Any) -> str:
    encoded = json.dumps(payload, sort_keys=True, default=str).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def _mask_string(value: str) -> str:
    masked = value
    for _, pattern in PII_PATTERNS:
        masked = pattern.sub("***", masked)
    return masked


def mask_pii(data: Any) -> Any:
    if isinstance(data, dict):
        masked: dict[str, Any] = {}
        for key, value in data.items():
            if key.lower() in SENSITIVE_KEYS:
                masked[key] = "***"
            else:
                masked[key] = mask_pii(value)
        return masked
    if isinstance(data, list):
        return [mask_pii(item) for item in data]
    if isinstance(data, str):
        return _mask_string(data)
    return data
