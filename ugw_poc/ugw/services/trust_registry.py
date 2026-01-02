from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from ugw.db.database import db_session


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def update_registry(user_id: str, vc_status: str, expires_at: Optional[str], revoked: bool) -> None:
    with db_session() as conn:
        conn.execute(
            "INSERT INTO trust_registry (user_id, vc_status, expires_at, revoked, updated_at) VALUES (?, ?, ?, ?, ?) "
            "ON CONFLICT(user_id) DO UPDATE SET vc_status = excluded.vc_status, expires_at = excluded.expires_at, revoked = excluded.revoked, updated_at = excluded.updated_at",
            (user_id, vc_status, expires_at, int(revoked), utc_now()),
        )


def get_registry(user_id: str) -> Optional[dict]:
    with db_session() as conn:
        row = conn.execute("SELECT * FROM trust_registry WHERE user_id = ?", (user_id,)).fetchone()
    return dict(row) if row else None
