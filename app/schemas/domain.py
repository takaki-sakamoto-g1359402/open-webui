from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from app.schemas.common import (
    ActorType,
    ApprovalSecurityLevel,
    EvidenceRef,
    PermissionLevel,
    new_id,
    new_trace_id,
    utcnow,
)


class EventCreate(BaseModel):
    event_type: str
    payload: dict[str, Any] = Field(default_factory=dict)
    evidence_refs: list[EvidenceRef] = Field(default_factory=list)
    trace_id: str = Field(default_factory=new_trace_id)
    source: str = "external"


class EventRecord(EventCreate):
    event_id: str = Field(default_factory=lambda: new_id("evt"))
    created_at: datetime = Field(default_factory=utcnow)
    status: str = "pending"


class TaskRecord(BaseModel):
    task_id: str = Field(default_factory=lambda: new_id("tsk"))
    trace_id: str
    title: str
    description: str
    assigned_to: str
    permission_level: PermissionLevel
    external_impact: bool = False
    status: str = "pending"
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)
    metadata: dict[str, Any] = Field(default_factory=dict)


class ApprovalRequest(BaseModel):
    approval_id: str = Field(default_factory=lambda: new_id("apr"))
    trace_id: str
    requested_action: dict[str, Any]
    risk_level: PermissionLevel = PermissionLevel.L4_HIGH_RISK
    required_asl: ApprovalSecurityLevel = ApprovalSecurityLevel.ASL3_PQC_ARTIFACT
    evidence_refs: list[EvidenceRef] = Field(default_factory=list)
    status: str = "pending"
    reason: str | None = None
    created_at: datetime = Field(default_factory=utcnow)
    decided_at: datetime | None = None
    decided_by: str | None = None


class ApprovalDecisionInput(BaseModel):
    actor_id: str
    decision: str
    reason: str
    webauthn_proof: dict[str, Any] | None = None
    otp_code: str | None = None
    pqc_signature: str | None = None
    challenge_id: str
    challenge_nonce: str


class ApprovalArtifact(BaseModel):
    approval_id: str
    trace_id: str
    actor_id: str
    requested_action: dict[str, Any]
    risk_level: PermissionLevel
    evidence_refs: list[EvidenceRef]
    decision: str
    reason: str
    timestamp: datetime = Field(default_factory=utcnow)
    server_challenge_id: str
    server_challenge_nonce: str
    webauthn_signature_proof: dict[str, Any] | None = None
    otp_proof_hash: str | None = None
    pqc_signature: str | None = None
    pqc_algorithm: str | None = None


class ChallengeRecord(BaseModel):
    challenge_id: str = Field(default_factory=lambda: new_id("chl"))
    trace_id: str
    approval_id: str
    actor_id: str
    nonce: str
    created_at: datetime = Field(default_factory=utcnow)
    expires_at: datetime
    used_at: datetime | None = None


class MemoryRecord(BaseModel):
    memory_id: str = Field(default_factory=lambda: new_id("mem"))
    trace_id: str
    scope: str
    key: str
    value: dict[str, Any]
    created_at: datetime = Field(default_factory=utcnow)


class PolicyRecord(BaseModel):
    policy_id: str = Field(default_factory=lambda: new_id("pol"))
    name: str
    description: str
    config: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=utcnow)


class AuditQuery(BaseModel):
    trace_id: str


class HealthResponse(BaseModel):
    status: str
    time: datetime
    actor: ActorType = ActorType.SYSTEM
