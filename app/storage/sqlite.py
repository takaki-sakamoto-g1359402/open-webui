from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Iterable

from app.schemas.common import AuditRecord
from app.schemas.domain import (
    ApprovalArtifact,
    ApprovalRequest,
    ChallengeRecord,
    EventRecord,
    MemoryRecord,
    TaskRecord,
)
from app.utils.redaction import hash_payload, mask_pii
from app.schemas.common import EvidenceRef


def _to_json(data: Any) -> str:
    return json.dumps(data, sort_keys=True, default=str)


def _from_json(raw: str | None) -> Any:
    if raw is None or raw == "":
        return None
    return json.loads(raw)


class SQLiteStorage:
    def __init__(self, db_path: str) -> None:
        self.db_path = db_path
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    @contextmanager
    def connect(self) -> Iterable[sqlite3.Connection]:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        finally:
            conn.close()

    def _init_db(self) -> None:
        with self.connect() as conn:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS events (
                    event_id TEXT PRIMARY KEY,
                    trace_id TEXT NOT NULL,
                    event_type TEXT NOT NULL,
                    payload TEXT NOT NULL,
                    payload_hash TEXT NOT NULL,
                    evidence_refs TEXT NOT NULL,
                    source TEXT NOT NULL,
                    status TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS tasks (
                    task_id TEXT PRIMARY KEY,
                    trace_id TEXT NOT NULL,
                    title TEXT NOT NULL,
                    description TEXT NOT NULL,
                    assigned_to TEXT NOT NULL,
                    permission_level TEXT NOT NULL,
                    external_impact INTEGER NOT NULL,
                    status TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    metadata TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS approvals (
                    approval_id TEXT PRIMARY KEY,
                    trace_id TEXT NOT NULL,
                    requested_action TEXT NOT NULL,
                    risk_level TEXT NOT NULL,
                    required_asl INTEGER NOT NULL,
                    evidence_refs TEXT NOT NULL,
                    status TEXT NOT NULL,
                    reason TEXT,
                    created_at TEXT NOT NULL,
                    decided_at TEXT,
                    decided_by TEXT
                );

                CREATE TABLE IF NOT EXISTS approval_artifacts (
                    approval_id TEXT PRIMARY KEY,
                    trace_id TEXT NOT NULL,
                    actor_id TEXT NOT NULL,
                    artifact TEXT NOT NULL,
                    artifact_hash TEXT NOT NULL,
                    pqc_algorithm TEXT,
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS challenges (
                    challenge_id TEXT PRIMARY KEY,
                    approval_id TEXT NOT NULL,
                    trace_id TEXT NOT NULL,
                    actor_id TEXT NOT NULL,
                    nonce TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    expires_at TEXT NOT NULL,
                    used_at TEXT
                );

                CREATE TABLE IF NOT EXISTS audit_logs (
                    audit_id TEXT PRIMARY KEY,
                    trace_id TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    actor_id TEXT NOT NULL,
                    actor_type TEXT NOT NULL,
                    permission_level TEXT NOT NULL,
                    action TEXT NOT NULL,
                    status TEXT NOT NULL,
                    inputs TEXT NOT NULL,
                    outputs TEXT NOT NULL,
                    evidence_refs TEXT NOT NULL,
                    policy_decision TEXT,
                    correlation_id TEXT
                );

                CREATE TABLE IF NOT EXISTS policies (
                    policy_id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    description TEXT NOT NULL,
                    config TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS memories (
                    memory_id TEXT PRIMARY KEY,
                    trace_id TEXT NOT NULL,
                    scope TEXT NOT NULL,
                    key TEXT NOT NULL,
                    value TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );
                """
            )

    def insert_event(self, event: EventRecord) -> None:
        payload_masked = mask_pii(event.payload)
        recipient = event.payload.get("recipient")
        if isinstance(recipient, str) and "@" in recipient:
            payload_masked["recipient_domain"] = recipient.split("@")[-1]
        with self.connect() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO events (
                    event_id, trace_id, event_type, payload, payload_hash, evidence_refs,
                    source, status, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    event.event_id,
                    event.trace_id,
                    event.event_type,
                    _to_json(payload_masked),
                    hash_payload(event.payload),
                    _to_json([ref.model_dump() for ref in event.evidence_refs]),
                    event.source,
                    event.status,
                    event.created_at.isoformat(),
                ),
            )

    def update_event_status(self, event_id: str, status: str) -> None:
        with self.connect() as conn:
            conn.execute("UPDATE events SET status = ? WHERE event_id = ?", (status, event_id))

    def list_events(self, status: str | None = None) -> list[EventRecord]:
        query = "SELECT * FROM events"
        params: tuple[Any, ...] = ()
        if status:
            query += " WHERE status = ?"
            params = (status,)
        query += " ORDER BY created_at ASC"
        with self.connect() as conn:
            rows = conn.execute(query, params).fetchall()
        return [self._row_to_event(row) for row in rows]

    def get_event(self, event_id: str) -> EventRecord | None:
        with self.connect() as conn:
            row = conn.execute("SELECT * FROM events WHERE event_id = ?", (event_id,)).fetchone()
        if row is None:
            return None
        return self._row_to_event(row)

    def get_event_by_trace(self, trace_id: str) -> EventRecord | None:
        with self.connect() as conn:
            row = conn.execute(
                "SELECT * FROM events WHERE trace_id = ? ORDER BY created_at ASC LIMIT 1", (trace_id,)
            ).fetchone()
        if row is None:
            return None
        return self._row_to_event(row)

    def create_task(self, task: TaskRecord) -> None:
        with self.connect() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO tasks (
                    task_id, trace_id, title, description, assigned_to, permission_level,
                    external_impact, status, created_at, updated_at, metadata
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    task.task_id,
                    task.trace_id,
                    task.title,
                    task.description,
                    task.assigned_to,
                    task.permission_level.value,
                    1 if task.external_impact else 0,
                    task.status,
                    task.created_at.isoformat(),
                    task.updated_at.isoformat(),
                    _to_json(mask_pii(task.metadata)),
                ),
            )

    def update_task_status(self, task_id: str, status: str, metadata: dict[str, Any] | None = None) -> None:
        with self.connect() as conn:
            conn.execute(
                """
                UPDATE tasks SET status = ?, updated_at = CURRENT_TIMESTAMP, metadata = ? WHERE task_id = ?
                """,
                (status, _to_json(mask_pii(metadata or {})), task_id),
            )

    def list_tasks(self) -> list[TaskRecord]:
        with self.connect() as conn:
            rows = conn.execute("SELECT * FROM tasks ORDER BY created_at ASC").fetchall()
        tasks: list[TaskRecord] = []
        for row in rows:
            tasks.append(
                TaskRecord(
                    task_id=row["task_id"],
                    trace_id=row["trace_id"],
                    title=row["title"],
                    description=row["description"],
                    assigned_to=row["assigned_to"],
                    permission_level=row["permission_level"],
                    external_impact=bool(row["external_impact"]),
                    status=row["status"],
                    created_at=row["created_at"],
                    updated_at=row["updated_at"],
                    metadata=_from_json(row["metadata"]) or {},
                )
            )
        return tasks

    def get_task(self, task_id: str) -> TaskRecord | None:
        with self.connect() as conn:
            row = conn.execute("SELECT * FROM tasks WHERE task_id = ?", (task_id,)).fetchone()
        if row is None:
            return None
        return TaskRecord(
            task_id=row["task_id"],
            trace_id=row["trace_id"],
            title=row["title"],
            description=row["description"],
            assigned_to=row["assigned_to"],
            permission_level=row["permission_level"],
            external_impact=bool(row["external_impact"]),
            status=row["status"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
            metadata=_from_json(row["metadata"]) or {},
        )

    def get_task_by_trace(self, trace_id: str) -> TaskRecord | None:
        with self.connect() as conn:
            row = conn.execute(
                "SELECT * FROM tasks WHERE trace_id = ? ORDER BY created_at ASC LIMIT 1", (trace_id,)
            ).fetchone()
        if row is None:
            return None
        return TaskRecord(
            task_id=row["task_id"],
            trace_id=row["trace_id"],
            title=row["title"],
            description=row["description"],
            assigned_to=row["assigned_to"],
            permission_level=row["permission_level"],
            external_impact=bool(row["external_impact"]),
            status=row["status"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
            metadata=_from_json(row["metadata"]) or {},
        )

    def create_approval(self, approval: ApprovalRequest) -> None:
        with self.connect() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO approvals (
                    approval_id, trace_id, requested_action, risk_level, required_asl,
                    evidence_refs, status, reason, created_at, decided_at, decided_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    approval.approval_id,
                    approval.trace_id,
                    _to_json(mask_pii(approval.requested_action)),
                    approval.risk_level.value,
                    int(approval.required_asl),
                    _to_json([ref.model_dump() for ref in approval.evidence_refs]),
                    approval.status,
                    approval.reason,
                    approval.created_at.isoformat(),
                    approval.decided_at.isoformat() if approval.decided_at else None,
                    approval.decided_by,
                ),
            )

    def update_approval(self, approval: ApprovalRequest) -> None:
        with self.connect() as conn:
            conn.execute(
                """
                UPDATE approvals
                SET status = ?, reason = ?, decided_at = ?, decided_by = ?, requested_action = ?, evidence_refs = ?
                WHERE approval_id = ?
                """,
                (
                    approval.status,
                    approval.reason,
                    approval.decided_at.isoformat() if approval.decided_at else None,
                    approval.decided_by,
                    _to_json(mask_pii(approval.requested_action)),
                    _to_json([ref.model_dump() for ref in approval.evidence_refs]),
                    approval.approval_id,
                ),
            )

    def get_approval(self, approval_id: str) -> ApprovalRequest | None:
        with self.connect() as conn:
            row = conn.execute("SELECT * FROM approvals WHERE approval_id = ?", (approval_id,)).fetchone()
        if row is None:
            return None
        return ApprovalRequest(
            approval_id=row["approval_id"],
            trace_id=row["trace_id"],
            requested_action=_from_json(row["requested_action"]) or {},
            risk_level=row["risk_level"],
            required_asl=row["required_asl"],
            evidence_refs=[EvidenceRef.model_validate(ref) for ref in (_from_json(row["evidence_refs"]) or [])],
            status=row["status"],
            reason=row["reason"],
            created_at=row["created_at"],
            decided_at=row["decided_at"],
            decided_by=row["decided_by"],
        )

    def list_approvals(self, status: str | None = None) -> list[ApprovalRequest]:
        query = "SELECT * FROM approvals"
        params: tuple[Any, ...] = ()
        if status:
            query += " WHERE status = ?"
            params = (status,)
        query += " ORDER BY created_at ASC"
        with self.connect() as conn:
            rows = conn.execute(query, params).fetchall()
        approvals: list[ApprovalRequest] = []
        for row in rows:
            approvals.append(
                ApprovalRequest(
                    approval_id=row["approval_id"],
                    trace_id=row["trace_id"],
                    requested_action=_from_json(row["requested_action"]) or {},
                    risk_level=row["risk_level"],
                    required_asl=row["required_asl"],
                    evidence_refs=[EvidenceRef.model_validate(ref) for ref in (_from_json(row["evidence_refs"]) or [])],
                    status=row["status"],
                    reason=row["reason"],
                    created_at=row["created_at"],
                    decided_at=row["decided_at"],
                    decided_by=row["decided_by"],
                )
            )
        return approvals

    def store_artifact(self, artifact: ApprovalArtifact, pqc_algorithm: str | None) -> None:
        payload = artifact.model_dump(mode="json")
        masked_payload = mask_pii(payload)
        artifact_hash = hash_payload(masked_payload)
        with self.connect() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO approval_artifacts (
                    approval_id, trace_id, actor_id, artifact, artifact_hash, pqc_algorithm, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    artifact.approval_id,
                    artifact.trace_id,
                    artifact.actor_id,
                    _to_json(masked_payload),
                    artifact_hash,
                    pqc_algorithm,
                    artifact.timestamp.isoformat(),
                ),
            )

    def get_artifact(self, approval_id: str) -> dict[str, Any] | None:
        with self.connect() as conn:
            row = conn.execute(
                "SELECT artifact FROM approval_artifacts WHERE approval_id = ?", (approval_id,)
            ).fetchone()
        if row is None:
            return None
        return _from_json(row["artifact"]) or {}

    def create_challenge(self, challenge: ChallengeRecord) -> None:
        with self.connect() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO challenges (
                    challenge_id, approval_id, trace_id, actor_id, nonce,
                    created_at, expires_at, used_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    challenge.challenge_id,
                    challenge.approval_id,
                    challenge.trace_id,
                    challenge.actor_id,
                    challenge.nonce,
                    challenge.created_at.isoformat(),
                    challenge.expires_at.isoformat(),
                    challenge.used_at.isoformat() if challenge.used_at else None,
                ),
            )

    def get_challenge(self, challenge_id: str) -> ChallengeRecord | None:
        with self.connect() as conn:
            row = conn.execute("SELECT * FROM challenges WHERE challenge_id = ?", (challenge_id,)).fetchone()
        if row is None:
            return None
        return ChallengeRecord(
            challenge_id=row["challenge_id"],
            approval_id=row["approval_id"],
            trace_id=row["trace_id"],
            actor_id=row["actor_id"],
            nonce=row["nonce"],
            created_at=row["created_at"],
            expires_at=row["expires_at"],
            used_at=row["used_at"],
        )

    def mark_challenge_used(self, challenge: ChallengeRecord) -> None:
        with self.connect() as conn:
            conn.execute(
                "UPDATE challenges SET used_at = ? WHERE challenge_id = ?",
                (challenge.used_at.isoformat() if challenge.used_at else None, challenge.challenge_id),
            )

    def add_audit(self, record: AuditRecord) -> None:
        masked_inputs = mask_pii(record.inputs)
        masked_outputs = mask_pii(record.outputs)
        with self.connect() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO audit_logs (
                    audit_id, trace_id, timestamp, actor_id, actor_type, permission_level,
                    action, status, inputs, outputs, evidence_refs, policy_decision, correlation_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    record.audit_id,
                    record.trace_id,
                    record.timestamp.isoformat(),
                    record.actor_id,
                    record.actor_type.value,
                    record.permission_level.value,
                    record.action,
                    record.status,
                    _to_json(masked_inputs),
                    _to_json(masked_outputs),
                    _to_json([ref.model_dump() for ref in record.evidence_refs]),
                    _to_json(record.policy_decision.model_dump(mode="json") if record.policy_decision else {}),
                    record.correlation_id,
                ),
            )

    def query_audit(self, trace_id: str) -> list[dict[str, Any]]:
        with self.connect() as conn:
            rows = conn.execute(
                "SELECT * FROM audit_logs WHERE trace_id = ? ORDER BY timestamp ASC", (trace_id,)
            ).fetchall()
        return [dict(row) for row in rows]

    def store_memory(self, memory: MemoryRecord) -> None:
        with self.connect() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO memories (
                    memory_id, trace_id, scope, key, value, created_at
                ) VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    memory.memory_id,
                    memory.trace_id,
                    memory.scope,
                    memory.key,
                    _to_json(mask_pii(memory.value)),
                    memory.created_at.isoformat(),
                ),
            )

    def list_memory(self, scope: str | None = None) -> list[MemoryRecord]:
        query = "SELECT * FROM memories"
        params: tuple[Any, ...] = ()
        if scope:
            query += " WHERE scope = ?"
            params = (scope,)
        query += " ORDER BY created_at ASC"
        with self.connect() as conn:
            rows = conn.execute(query, params).fetchall()
        return [
            MemoryRecord(
                memory_id=row["memory_id"],
                trace_id=row["trace_id"],
                scope=row["scope"],
                key=row["key"],
                value=_from_json(row["value"]) or {},
                created_at=row["created_at"],
            )
            for row in rows
        ]

    def recent_audit_actions(self, window_seconds: int) -> list[dict[str, Any]]:
        with self.connect() as conn:
            rows = conn.execute(
                """
                SELECT * FROM audit_logs
                WHERE timestamp >= datetime('now', ?)
                ORDER BY timestamp ASC
                """,
                (f"-{window_seconds} seconds",),
            ).fetchall()
        return [dict(row) for row in rows]

    def _row_to_event(self, row: sqlite3.Row) -> EventRecord:
        return EventRecord(
            event_id=row["event_id"],
            trace_id=row["trace_id"],
            event_type=row["event_type"],
            payload=_from_json(row["payload"]),
            evidence_refs=[EvidenceRef.model_validate(ref) for ref in (_from_json(row["evidence_refs"]) or [])],
            source=row["source"],
            status=row["status"],
            created_at=row["created_at"],
        )
