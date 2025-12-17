"""Post-quantum inspired signing interface.

Replace with Dilithium/Kyber-based signing when deployed.
"""
from __future__ import annotations

import hashlib
import hmac
import os
from typing import Optional

SECRET = os.getenv("RVLOOP_SIGNING_KEY", "rvloop-dev-secret").encode()


def sign(message_bytes: bytes) -> bytes:
    return hmac.new(SECRET, message_bytes, hashlib.sha256).digest()


def verify(message_bytes: bytes, signature_bytes: Optional[bytes]) -> bool:
    if signature_bytes is None:
        return False
    expected = sign(message_bytes)
    return hmac.compare_digest(expected, signature_bytes)
