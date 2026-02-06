from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any
from uuid import UUID, uuid4

from app.schemas.enums import ApprovalStatus, TaskStatus
from app.schemas.models import (
    ApprovalRecord,
    ApprovalRequest,
    AuditLogEntry,
    EvidenceRef,
    EventCreate,
    EventRecord,
    MemoryRecord,
    PolicyDecision,
    TaskRecord,
)
from app.storage.database import Database, utc_now_iso



def _utc_now() -> datetime:
    return datetime.now(tz=timezone.utc)


@dataclass(slots=True)
class EventRepository:
    db: Database

    def create(self, event: EventCreate) -> EventRecord:
        trace_id = event.trace_id or uuid4()
        now = utc_now_iso()
        event_id = self.db.execute(
            """
            INSERT INTO events (type, payload, trace_id, status, created_at, updated_at)
            VALUES (?, ?, ?, 'new', ?, ?)
            """,
            (event.type, self.db.dumps(event.payload), str(trace_id), now, now),
        )
        return self.get(event_id)

    def get(self, event_id: int) -> EventRecord:
        row = self.db.fetch_one("SELECT * FROM events WHERE id = ?", (event_id,))
        if row is None:
            raise ValueError(f"event {event_id} not found")
        return EventRecord(
            id=row["id"],
            type=row["type"],
            payload=self.db.loads(row["payload"]),
            trace_id=UUID(row["trace_id"]),
            status=row["status"],
            created_at=datetime.fromisoformat(row["created_at"]),
            updated_at=datetime.fromisoformat(row["updated_at"]),
        )

    def list_new(self, limit: int = 20) -> list[EventRecord]:
        rows = self.db.fetch_all(
            "SELECT * FROM events WHERE status = 'new' ORDER BY id ASC LIMIT ?",
            (limit,),
        )
        return [self.get(int(row["id"])) for row in rows]

    def update_status(self, event_id: int, status: str) -> None:
        now = utc_now_iso()
        self.db.execute(
            "UPDATE events SET status = ?, updated_at = ? WHERE id = ?",
            (status, now, event_id),
        )


@dataclass(slots=True)
class TaskRepository:
    db: Database

    def create(
        self,
        *,
        trace_id: UUID,
        event_id: int,
        agent_id: str,
        tool_name: str,
        permission_level: int,
        status: TaskStatus,
        requires_approval: bool,
        input_payload: dict[str, Any],
        approval_id: int | None = None,
    ) -> TaskRecord:
        now = utc_now_iso()
        task_id = self.db.execute(
            """
            INSERT INTO tasks (
                trace_id, event_id, agent_id, tool_name, permission_level, status,
                requires_approval, approval_id, input, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                str(trace_id),
                event_id,
                agent_id,
                tool_name,
                permission_level,
                status.value,
                int(requires_approval),
                approval_id,
                self.db.dumps(input_payload),
                now,
                now,
            ),
        )
        return self.get(task_id)

    def get(self, task_id: int) -> TaskRecord:
        row = self.db.fetch_one("SELECT * FROM tasks WHERE id = ?", (task_id,))
        if row is None:
            raise ValueError(f"task {task_id} not found")
        return TaskRecord(
            id=row["id"],
            trace_id=UUID(row["trace_id"]),
            event_id=row["event_id"],
            agent_id=row["agent_id"],
            tool_name=row["tool_name"],
            permission_level=row["permission_level"],
            status=TaskStatus(row["status"]),
            requires_approval=bool(row["requires_approval"]),
            approval_id=row["approval_id"],
            input=self.db.loads(row["input"]),
            output=self.db.loads(row["output"]) if row["output"] else None,
            created_at=datetime.fromisoformat(row["created_at"]),
            updated_at=datetime.fromisoformat(row["updated_at"]),
        )

    def update_status(self, task_id: int, status: TaskStatus, output: dict[str, Any] | None = None) -> None:
        now = utc_now_iso()
        output_payload = self.db.dumps(output) if output is not None else None
        self.db.execute(
            "UPDATE tasks SET status = ?, output = COALESCE(?, output), updated_at = ? WHERE id = ?",
            (status.value, output_payload, now, task_id),
        )

    def attach_approval(self, task_id: int, approval_id: int) -> None:
        now = utc_now_iso()
        self.db.execute(
            "UPDATE tasks SET approval_id = ?, requires_approval = 1, updated_at = ? WHERE id = ?",
            (approval_id, now, task_id),
        )

    def list(self) -> list[TaskRecord]:
        rows = self.db.fetch_all("SELECT id FROM tasks ORDER BY id ASC")
        return [self.get(int(row["id"])) for row in rows]

    def list_by_status(self, status: TaskStatus) -> list[TaskRecord]:
        rows = self.db.fetch_all(
            "SELECT id FROM tasks WHERE status = ? ORDER BY id ASC",
            (status.value,),
        )
        return [self.get(int(row["id"])) for row in rows]


@dataclass(slots=True)
class ApprovalRepository:
    db: Database

    def create(self, request: ApprovalRequest) -> ApprovalRecord:
        now = utc_now_iso()
        approval_id = self.db.execute(
            """
            INSERT INTO approvals (
                task_id, trace_id, status, reason, required_level, details,
                override_scope, expires_at, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                request.task_id,
                str(request.trace_id),
                ApprovalStatus.PENDING.value,
                request.reason,
                int(request.required_level),
                self.db.dumps(request.details),
                self.db.dumps(request.override_scope) if request.override_scope else None,
                request.expires_at.isoformat() if request.expires_at else None,
                now,
                now,
            ),
        )
        return self.get(approval_id)

    def get(self, approval_id: int) -> ApprovalRecord:
        row = self.db.fetch_one("SELECT * FROM approvals WHERE id = ?", (approval_id,))
        if row is None:
            raise ValueError(f"approval {approval_id} not found")
        return ApprovalRecord(
            id=row["id"],
            task_id=row["task_id"],
            trace_id=UUID(row["trace_id"]),
            status=ApprovalStatus(row["status"]),
            reason=row["reason"],
            required_level=row["required_level"],
            details=self.db.loads(row["details"]),
            override_scope=self.db.loads(row["override_scope"]) if row["override_scope"] else None,
            expires_at=datetime.fromisoformat(row["expires_at"]) if row["expires_at"] else None,
            decided_by=row["decided_by"],
            decided_reason=row["decided_reason"],
            created_at=datetime.fromisoformat(row["created_at"]),
            updated_at=datetime.fromisoformat(row["updated_at"]),
        )

    def list_pending(self) -> list[ApprovalRecord]:
        rows = self.db.fetch_all(
            "SELECT id FROM approvals WHERE status = ? ORDER BY id ASC",
            (ApprovalStatus.PENDING.value,),
        )
        return [self.get(int(row["id"])) for row in rows]

    def list_all(self, status: ApprovalStatus | None = None) -> list[ApprovalRecord]:
        if status is None:
            rows = self.db.fetch_all("SELECT id FROM approvals ORDER BY id ASC")
        else:
            rows = self.db.fetch_all(
                "SELECT id FROM approvals WHERE status = ? ORDER BY id ASC",
                (status.value,),
            )
        return [self.get(int(row["id"])) for row in rows]

    def update_status(
        self,
        approval_id: int,
        *,
        status: ApprovalStatus,
        decided_by: str,
        decided_reason: str | None,
        override_scope: dict[str, Any] | None,
        expires_at: datetime | None,
    ) -> ApprovalRecord:
        now = utc_now_iso()
        self.db.execute(
            """
            UPDATE approvals
            SET status = ?, decided_by = ?, decided_reason = ?, override_scope = ?, expires_at = ?, updated_at = ?
            WHERE id = ?
            """,
            (
                status.value,
                decided_by,
                decided_reason,
                self.db.dumps(override_scope) if override_scope else None,
                expires_at.isoformat() if expires_at else None,
                now,
                approval_id,
            ),
        )
        return self.get(approval_id)


@dataclass(slots=True)
class AuditRepository:
    db: Database

    def log(self, entry: AuditLogEntry) -> AuditLogEntry:
        created_at = entry.created_at.isoformat()
        log_id = self.db.execute(
            """
            INSERT INTO audit_logs (
                trace_id, correlation_id, actor, action, permission_level,
                input, output, policy_decision, evidence, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                str(entry.trace_id),
                str(entry.correlation_id),
                entry.actor,
                entry.action,
                int(entry.permission_level),
                self.db.dumps(entry.input),
                self.db.dumps(entry.output),
                self.db.dumps(entry.policy_decision),
                self.db.dumps([e.model_dump() for e in entry.evidence]),
                created_at,
            ),
        )
        entry.id = log_id
        return entry

    def list_by_trace(self, trace_id: UUID) -> list[AuditLogEntry]:
        rows = self.db.fetch_all(
            "SELECT * FROM audit_logs WHERE trace_id = ? ORDER BY id ASC",
            (str(trace_id),),
        )
        entries: list[AuditLogEntry] = []
        for row in rows:
            evidence_payload = self.db.loads(row["evidence"])
            entries.append(
                AuditLogEntry(
                    id=row["id"],
                    trace_id=UUID(row["trace_id"]),
                    correlation_id=UUID(row["correlation_id"]),
                    actor=row["actor"],
                    action=row["action"],
                    permission_level=row["permission_level"],
                    input=self.db.loads(row["input"]),
                    output=self.db.loads(row["output"]),
                    policy_decision=self.db.loads(row["policy_decision"]),
                    evidence=[EvidenceRef.model_validate(item) for item in evidence_payload],
                    created_at=datetime.fromisoformat(row["created_at"]),
                )
            )
        return entries


@dataclass(slots=True)
class PolicyRepository:
    db: Database

    def record(self, trace_id: UUID, task_id: int | None, decision: PolicyDecision) -> None:
        now = utc_now_iso()
        self.db.execute(
            "INSERT INTO policies (trace_id, task_id, decision, created_at) VALUES (?, ?, ?, ?)",
            (str(trace_id), task_id, self.db.dumps(decision.model_dump(mode="python")), now),
        )


@dataclass(slots=True)
class MemoryRepository:
    db: Database

    def put(self, trace_id: UUID, *, kind: str, key: str, value: dict[str, Any]) -> MemoryRecord:
        now = utc_now_iso()
        memory_id = self.db.execute(
            "INSERT INTO memories (trace_id, kind, key, value, created_at) VALUES (?, ?, ?, ?, ?)",
            (str(trace_id), kind, key, self.db.dumps(value), now),
        )
        return self.get(memory_id)

    def get(self, memory_id: int) -> MemoryRecord:
        row = self.db.fetch_one("SELECT * FROM memories WHERE id = ?", (memory_id,))
        if row is None:
            raise ValueError(f"memory {memory_id} not found")
        return MemoryRecord(
            id=row["id"],
            trace_id=UUID(row["trace_id"]),
            kind=row["kind"],
            key=row["key"],
            value=self.db.loads(row["value"]),
            created_at=datetime.fromisoformat(row["created_at"]),
        )

    def list_by_trace(self, trace_id: UUID, kind: str) -> list[MemoryRecord]:
        rows = self.db.fetch_all(
            "SELECT id FROM memories WHERE trace_id = ? AND kind = ? ORDER BY id ASC",
            (str(trace_id), kind),
        )
        return [self.get(int(row["id"])) for row in rows]
