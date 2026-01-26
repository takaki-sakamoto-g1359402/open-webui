from __future__ import annotations

import hashlib
import hmac
from dataclasses import dataclass
from typing import Any


@dataclass
class PQCSignature:
    algorithm: str
    signature: str


class PQCSigner:
    """
    Post-quantum signing interface.

    This environment does not provide ML-DSA / SLH-DSA libraries, so we use a
    deterministic HMAC-based stub that preserves interfaces and audit bindings.
    Replace with a NIST-standardized PQC implementation in production.
    """

    def __init__(self, private_key: str, public_key: str, algorithm: str = "ML-DSA-stub") -> None:
        self.private_key = private_key
        self.public_key = public_key
        self.algorithm = algorithm

    def sign(self, payload: dict[str, Any]) -> PQCSignature:
        message = self._serialize(payload)
        signature = hmac.new(self.private_key.encode("utf-8"), message, hashlib.sha512).hexdigest()
        return PQCSignature(algorithm=self.algorithm, signature=signature)

    def verify(self, payload: dict[str, Any], signature: str) -> bool:
        message = self._serialize(payload)
        expected = hmac.new(self.private_key.encode("utf-8"), message, hashlib.sha512).hexdigest()
        return hmac.compare_digest(expected, signature)

    def _serialize(self, payload: dict[str, Any]) -> bytes:
        items = sorted((str(k), str(v)) for k, v in payload.items())
        joined = "|".join(f"{k}={v}" for k, v in items)
        return joined.encode("utf-8")
