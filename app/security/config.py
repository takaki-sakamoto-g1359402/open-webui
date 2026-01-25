from __future__ import annotations

import os
from dataclasses import dataclass


def _require_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


@dataclass
class SecurityConfig:
    webauthn_hmac_key: str
    otp_secret: str
    pqc_private_key: str
    pqc_public_key: str
    challenge_ttl_seconds: int = 300

    @classmethod
    def from_env(cls) -> "SecurityConfig":
        return cls(
            webauthn_hmac_key=_require_env("AIOS_WEBAUTHN_HMAC_KEY"),
            otp_secret=_require_env("AIOS_OTP_SECRET"),
            pqc_private_key=_require_env("AIOS_PQC_PRIVATE_KEY"),
            pqc_public_key=_require_env("AIOS_PQC_PUBLIC_KEY"),
            challenge_ttl_seconds=int(os.getenv("AIOS_CHALLENGE_TTL_SECONDS", "300")),
        )
