from __future__ import annotations

import json

from orchestrator_os.core.audit import build_event, compute_event_hash
from orchestrator_os.core.models import AuditEvent
from orchestrator_os.storage.db import get_connection


class AuditStore:
    def append_event(self, task_id: str, event_type: str, actor: str, payload: dict) -> AuditEvent:
        with get_connection() as conn:
            row = conn.execute(
                "SELECT hash FROM audit_events WHERE task_id = ? ORDER BY timestamp DESC LIMIT 1",
                (task_id,),
            ).fetchone()
            prev_hash = row[0] if row else ""
            event = build_event(task_id, event_type, actor, payload, prev_hash)
            conn.execute(
                """
                INSERT INTO audit_events (id, timestamp, task_id, event_type, actor, payload_json, prev_hash, hash)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    event.id,
                    event.timestamp,
                    event.task_id,
                    event.event_type,
                    event.actor,
                    json.dumps(event.payload, sort_keys=True, separators=(",", ":"), allow_nan=False),
                    event.prev_hash,
                    event.hash,
                ),
            )
            conn.commit()
            return event

    def list_events(self, task_id: str) -> list[AuditEvent]:
        with get_connection() as conn:
            rows = conn.execute(
                "SELECT * FROM audit_events WHERE task_id = ? ORDER BY timestamp ASC", (task_id,)
            ).fetchall()
        return [
            AuditEvent(
                id=r["id"],
                timestamp=r["timestamp"],
                task_id=r["task_id"],
                event_type=r["event_type"],
                actor=r["actor"],
                payload=json.loads(r["payload_json"]),
                prev_hash=r["prev_hash"],
                hash=r["hash"],
            )
            for r in rows
        ]

    def verify_chain(self, task_id: str) -> tuple[bool, str]:
        events = self.list_events(task_id)
        prev = ""
        for idx, event in enumerate(events):
            data = event.model_dump(exclude={"hash"})
            expected = compute_event_hash(prev, data)
            if expected != event.hash:
                return False, f"Hash mismatch at index {idx}"
            prev = event.hash
        return True, "ok"
