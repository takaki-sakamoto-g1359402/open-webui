from __future__ import annotations

import base64
import hashlib
import hmac
import struct
import time

from app.utils.redaction import hash_payload


def _int_to_bytes(value: int) -> bytes:
    return struct.pack(">Q", value)


def _normalize_secret(secret: str) -> bytes:
    padding = "=" * (-len(secret) % 8)
    return base64.b32decode((secret + padding).upper())


def _hotp(secret: bytes, counter: int, digits: int = 6) -> str:
    digest = hmac.new(secret, _int_to_bytes(counter), hashlib.sha1).digest()
    offset = digest[-1] & 0x0F
    code = (
        ((digest[offset] & 0x7F) << 24)
        | (digest[offset + 1] << 16)
        | (digest[offset + 2] << 8)
        | digest[offset + 3]
    )
    return str(code % (10**digits)).zfill(digits)


def generate_totp(secret_b32: str, for_time: int | None = None, step_seconds: int = 30) -> str:
    secret = _normalize_secret(secret_b32)
    timestamp = for_time if for_time is not None else int(time.time())
    counter = int(timestamp // step_seconds)
    return _hotp(secret, counter)


def verify_totp(code: str, secret_b32: str, window: int = 1, step_seconds: int = 30) -> tuple[bool, str]:
    secret = _normalize_secret(secret_b32)
    now_counter = int(time.time() // step_seconds)
    for offset in range(-window, window + 1):
        candidate = _hotp(secret, now_counter + offset)
        if hmac.compare_digest(candidate, code):
            verification_hash = hash_payload({"counter": now_counter + offset, "code": code[-2:]})
            return True, verification_hash
    verification_hash = hash_payload({"counter": now_counter, "code": "invalid"})
    return False, verification_hash
