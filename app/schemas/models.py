from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Literal
from uuid import UUID, uuid4

from pydantic import BaseModel, Field

from app.schemas.enums import ApprovalStatus, PermissionLevel, TaskStatus



def utc_now() -> datetime:
    return datetime.now(tz=timezone.utc)


class EvidenceRef(BaseModel):
    source: str
    detail: str


class EventCreate(BaseModel):
    type: str = Field(description="Event category, e.g., customer_complaint")
    payload: dict[str, Any]
    trace_id: UUID | None = None


class EventRecord(BaseModel):
    id: int
    type: str
    payload: dict[str, Any]
    trace_id: UUID
    status: Literal["new", "processing", "processed", "held"]
    created_at: datetime
    updated_at: datetime


class TaskRecord(BaseModel):
    id: int
    trace_id: UUID
    event_id: int
    agent_id: str
    tool_name: str
    permission_level: PermissionLevel
    status: TaskStatus
    requires_approval: bool = False
    approval_id: int | None = None
    input: dict[str, Any]
    output: dict[str, Any] | None = None
    created_at: datetime
    updated_at: datetime


class PolicyDecision(BaseModel):
    allowed: bool
    requires_approval: bool
    reasons: list[str] = Field(default_factory=list)
    required_level: PermissionLevel
    kill_switch: bool = False
    escalation_reasons: list[str] = Field(default_factory=list)


class ApprovalRequest(BaseModel):
    task_id: int
    trace_id: UUID
    reason: str
    required_level: PermissionLevel
    details: dict[str, Any]
    override_scope: dict[str, Any] | None = None
    expires_at: datetime | None = None


class ApprovalAction(BaseModel):
    approval_id: int
    actor: str = Field(default="ceo")
    action: Literal["approve", "deny", "request_alternative"]
    reason: str | None = None
    override_scope: dict[str, Any] | None = None
    override_ttl_seconds: int | None = None


class ApprovalRecord(BaseModel):
    id: int
    task_id: int
    trace_id: UUID
    status: ApprovalStatus
    reason: str
    required_level: PermissionLevel
    details: dict[str, Any]
    override_scope: dict[str, Any] | None = None
    expires_at: datetime | None = None
    decided_by: str | None = None
    decided_reason: str | None = None
    created_at: datetime
    updated_at: datetime


class ToolCallContext(BaseModel):
    trace_id: UUID
    task_id: int
    agent_id: str
    permission_level: PermissionLevel
    evidence: list[EvidenceRef] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class ToolResult(BaseModel):
    success: bool
    output: dict[str, Any]
    evidence: list[EvidenceRef] = Field(default_factory=list)
    anomalies: list[str] = Field(default_factory=list)
    policy_notes: list[str] = Field(default_factory=list)
    post_check_failed: bool = False


class AuditLogEntry(BaseModel):
    id: int | None = None
    trace_id: UUID
    correlation_id: UUID = Field(default_factory=uuid4)
    actor: str
    action: str
    permission_level: PermissionLevel
    input: dict[str, Any]
    output: dict[str, Any]
    policy_decision: dict[str, Any]
    evidence: list[EvidenceRef] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=utc_now)


class MemoryRecord(BaseModel):
    id: int
    trace_id: UUID
    kind: Literal["short_term", "long_term"]
    key: str
    value: dict[str, Any]
    created_at: datetime
