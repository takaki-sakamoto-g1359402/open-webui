"""Core pydantic models."""

from __future__ import annotations

from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class RiskTier(str, Enum):
    R0 = "R0"
    R1 = "R1"
    R2 = "R2"
    R3 = "R3"


class PolicyDecision(str, Enum):
    ALLOW = "ALLOW"
    DENY = "DENY"
    REQUIRE_APPROVAL = "REQUIRE_APPROVAL"


class TaskState(str, Enum):
    CREATED = "CREATED"
    PLANNED = "PLANNED"
    EXECUTING = "EXECUTING"
    REVIEWING = "REVIEWING"
    WAITING_FOR_APPROVAL = "WAITING_FOR_APPROVAL"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class TaskRequest(BaseModel):
    goal: str
    context: dict[str, Any] | None = None
    risk_budget: dict[str, Any] | None = None


class PlanStep(BaseModel):
    step_id: str
    title: str
    instruction: str
    suggested_tools: list[str] = Field(default_factory=list)
    risk_hint: RiskTier = RiskTier.R0
    max_attempts: int = 2


class Plan(BaseModel):
    steps: list[PlanStep]


class ToolCallRequest(BaseModel):
    tool_name: str
    input: dict[str, Any]
    requested_scopes: list[str]
    justification: str


class ToolCallResult(BaseModel):
    ok: bool
    output: dict[str, Any] | None = None
    error: str | None = None
    artifact_refs: list[str] = Field(default_factory=list)


class TaskResult(BaseModel):
    task_id: str
    state: TaskState
    summary: str = ""
    artifacts: list[str] = Field(default_factory=list)
    audit_event_ids: list[str] = Field(default_factory=list)
    approvals_pending: list[str] = Field(default_factory=list)


class AuditEvent(BaseModel):
    id: str
    timestamp: str
    task_id: str
    event_type: str
    actor: str
    payload: dict[str, Any]
    prev_hash: str = ""
    hash: str


class ApprovalStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    DENIED = "DENIED"


class ApprovalRecord(BaseModel):
    approval_id: str
    created_at: str
    task_id: str
    actor: str
    tool_name: str
    risk_tier: RiskTier
    scopes: list[str]
    request_payload: dict[str, Any]
    status: ApprovalStatus
    decision_at: str | None = None
    decision_by: str | None = None
    decision_reason: str | None = None
