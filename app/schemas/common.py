from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Literal
from uuid import uuid4

from pydantic import BaseModel, Field


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def new_trace_id() -> str:
    return str(uuid4())


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid4()}"


class PermissionLevel(str, Enum):
    L0_OBSERVE = "L0"
    L1_PROPOSE = "L1"
    L2_INTERNAL_EXECUTE = "L2"
    L3_CONDITIONAL_EXECUTE = "L3"
    L4_HIGH_RISK = "L4"


class ApprovalSecurityLevel(int, Enum):
    ASL0_DISALLOWED = 0
    ASL1_PASSKEY = 1
    ASL2_PASSKEY_OTP = 2
    ASL3_PQC_ARTIFACT = 3
    ASL4_MAX = 4


class PolicyDecision(BaseModel):
    allowed: bool
    requires_approval: bool = False
    reasons: list[str] = Field(default_factory=list)
    required_level: PermissionLevel | None = None
    required_asl: ApprovalSecurityLevel | None = None


class EvidenceRef(BaseModel):
    ref_id: str
    uri: str | None = None
    hash_sha256: str | None = None


class ActorType(str, Enum):
    ORCHESTRATOR = "orchestrator"
    AGENT = "agent"
    CEO = "ceo"
    SYSTEM = "system"


class AuditRecord(BaseModel):
    audit_id: str = Field(default_factory=lambda: new_id("audit"))
    trace_id: str
    timestamp: datetime = Field(default_factory=utcnow)
    actor_id: str
    actor_type: ActorType
    permission_level: PermissionLevel
    action: str
    status: Literal["started", "completed", "blocked", "requires_approval", "failed"]
    inputs: dict[str, Any] = Field(default_factory=dict)
    outputs: dict[str, Any] = Field(default_factory=dict)
    evidence_refs: list[EvidenceRef] = Field(default_factory=list)
    policy_decision: PolicyDecision | None = None
    correlation_id: str | None = None
