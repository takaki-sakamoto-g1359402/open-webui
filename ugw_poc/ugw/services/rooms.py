from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from ugw.db.database import db_session


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def create_room(room_id: str, name: str, creator_id: str, participants: list[str]) -> None:
    with db_session() as conn:
        conn.execute(
            "INSERT INTO rooms (id, name, status, legal_hold, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (room_id, name, "open", 0, creator_id, utc_now()),
        )
        for participant in set(participants + [creator_id]):
            conn.execute(
                "INSERT INTO room_participants (room_id, user_id, status) VALUES (?, ?, ?)",
                (room_id, participant, "active"),
            )


def get_room(room_id: str) -> Optional[dict]:
    with db_session() as conn:
        row = conn.execute("SELECT * FROM rooms WHERE id = ?", (room_id,)).fetchone()
    return dict(row) if row else None


def close_room(room_id: str) -> None:
    with db_session() as conn:
        conn.execute("UPDATE rooms SET status = 'closed' WHERE id = ?", (room_id,))


def set_legal_hold(room_id: str, enabled: bool) -> None:
    with db_session() as conn:
        conn.execute("UPDATE rooms SET legal_hold = ? WHERE id = ?", (int(enabled), room_id))


def invite(room_id: str, invite_id: str, inviter_id: str, invitee_id: str) -> None:
    with db_session() as conn:
        conn.execute(
            "INSERT INTO invites (id, room_id, inviter_id, invitee_id, status, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (invite_id, room_id, inviter_id, invitee_id, "pending", utc_now()),
        )


def update_invite(invite_id: str, status: str) -> dict:
    with db_session() as conn:
        conn.execute("UPDATE invites SET status = ? WHERE id = ?", (status, invite_id))
        row = conn.execute("SELECT * FROM invites WHERE id = ?", (invite_id,)).fetchone()
    if row is None:
        raise ValueError("Invite not found")
    if status == "accepted":
        with db_session() as conn:
            conn.execute(
                "INSERT OR IGNORE INTO room_participants (room_id, user_id, status) VALUES (?, ?, ?)",
                (row["room_id"], row["invitee_id"], "active"),
            )
    return dict(row)


def remove_participant(room_id: str, user_id: str) -> None:
    with db_session() as conn:
        conn.execute("DELETE FROM room_participants WHERE room_id = ? AND user_id = ?", (room_id, user_id))
