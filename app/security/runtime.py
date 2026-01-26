from __future__ import annotations

import base64
import logging
import os
import secrets

from app.security.config import SecurityConfig

logger = logging.getLogger(__name__)


def _random_b32(length: int = 16) -> str:
    raw = secrets.token_bytes(length)
    return base64.b32encode(raw).decode("utf-8").rstrip("=")


def ensure_security_env_defaults() -> None:
    defaults = {
        "AIOS_WEBAUTHN_HMAC_KEY": secrets.token_hex(32),
        "AIOS_OTP_SECRET": _random_b32(),
        "AIOS_PQC_PRIVATE_KEY": secrets.token_hex(48),
        "AIOS_PQC_PUBLIC_KEY": secrets.token_hex(48),
    }
    for key, value in defaults.items():
        if not os.getenv(key):
            os.environ[key] = value
            logger.warning("security_env_defaulted", extra={"extra": {"key": key}})


def load_security_config() -> SecurityConfig:
    ensure_security_env_defaults()
    return SecurityConfig.from_env()
