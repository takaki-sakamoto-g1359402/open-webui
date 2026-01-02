from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Optional

from ugw.db.database import db_session


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def create_user(user_id: str, name: str, role: str) -> None:
    with db_session() as conn:
        conn.execute(
            "INSERT INTO users (id, name, role, pop_status, vc_status, vc_expiry, vc_revoked, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (user_id, name, role, "unverified", "none", None, 0, utc_now()),
        )


def get_user(user_id: str) -> Optional[dict]:
    with db_session() as conn:
        row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    return dict(row) if row else None


def update_pop(user_id: str, method: str, proof: dict) -> dict:
    pop_record = {
        "method": method,
        "proof": proof,
        "verified_at": utc_now(),
    }
    with db_session() as conn:
        conn.execute("UPDATE users SET pop_status = ? WHERE id = ?", (json.dumps(pop_record), user_id))
    return pop_record


def issue_vc(user_id: str, expires_at: Optional[str]) -> dict:
    vc_record = {
        "status": "valid",
        "issued_at": utc_now(),
        "expires_at": expires_at,
    }
    with db_session() as conn:
        conn.execute(
            "UPDATE users SET vc_status = ?, vc_expiry = ?, vc_revoked = 0 WHERE id = ?",
            (json.dumps(vc_record), expires_at, user_id),
        )
    return vc_record


def revoke_vc(user_id: str, reason: str) -> dict:
    record = {"status": "revoked", "reason": reason, "revoked_at": utc_now()}
    with db_session() as conn:
        conn.execute(
            "UPDATE users SET vc_status = ?, vc_revoked = 1 WHERE id = ?",
            (json.dumps(record), user_id),
        )
    return record


def update_vc_status(user_id: str, vc_status: str, expires_at: Optional[str], revoked: bool) -> None:
    with db_session() as conn:
        conn.execute(
            "UPDATE users SET vc_status = ?, vc_expiry = ?, vc_revoked = ? WHERE id = ?",
            (vc_status, expires_at, int(revoked), user_id),
        )
