"""セキュリティ関連ユーティリティ."""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
from datetime import datetime, timedelta
from typing import Any, Dict

from .config import settings


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return hashlib.sha256(plain_password.encode()).hexdigest() == hashed_password


def get_password_hash(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def _sign(data: bytes) -> str:
    return hmac.new(settings.JWT_SECRET.encode(), data, hashlib.sha256).hexdigest()


def create_access_token(
    data: Dict[str, Any], expires_delta: timedelta | None = None
) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
        to_encode["exp"] = int(expire.timestamp())
    payload = json.dumps(to_encode, separators=(",", ":")).encode()
    signature = _sign(payload)
    token = base64.urlsafe_b64encode(payload + b"." + signature.encode()).decode()
    return token


def verify_token(token: str) -> Dict[str, Any]:
    try:
        decoded = base64.urlsafe_b64decode(token.encode()).decode()
        payload_str, signature = decoded.rsplit(".", 1)
    except Exception as exc:  # noqa: BLE001
        raise ValueError("Malformed token") from exc
    expected = _sign(payload_str.encode())
    if not hmac.compare_digest(signature, expected):
        raise ValueError("Invalid signature")
    return json.loads(payload_str)
