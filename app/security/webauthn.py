from __future__ import annotations

import hashlib
import hmac
from typing import Any


def make_webauthn_proof(actor_id: str, challenge_id: str, nonce: str, shared_key: str) -> dict[str, Any]:
    message = f"{actor_id}:{challenge_id}:{nonce}".encode("utf-8")
    signature = hmac.new(shared_key.encode("utf-8"), message, hashlib.sha256).hexdigest()
    return {
        "actor_id": actor_id,
        "challenge_id": challenge_id,
        "nonce": nonce,
        "signature": signature,
        "method": "webauthn-hmac-stub",
        "biometric": True,
    }


def verify_webauthn_proof(proof: dict[str, Any], actor_id: str, challenge_id: str, nonce: str, shared_key: str) -> bool:
    provided_sig = str(proof.get("signature", ""))
    expected = make_webauthn_proof(actor_id=actor_id, challenge_id=challenge_id, nonce=nonce, shared_key=shared_key)[
        "signature"
    ]
    return hmac.compare_digest(provided_sig, expected)
