from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, List, Optional

from pydantic import BaseModel, Field


class Role(str, Enum):
    admin = "admin"
    auditor = "auditor"
    participant = "participant"


class Classification(str, Enum):
    public = "PUBLIC"
    restricted = "RESTRICTED"
    confidential = "CONFIDENTIAL"


class RoomStatus(str, Enum):
    open = "open"
    closed = "closed"


class InviteStatus(str, Enum):
    pending = "pending"
    accepted = "accepted"
    declined = "declined"


class UserCreate(BaseModel):
    id: str
    name: str
    role: Role


class UserRecord(BaseModel):
    id: str
    name: str
    role: Role
    pop_status: str
    vc_status: str
    vc_expiry: Optional[str]
    vc_revoked: bool
    created_at: str


class PoPRequest(BaseModel):
    method: str
    proof: dict


class VCRequest(BaseModel):
    expires_at: Optional[str] = None


class RoomCreate(BaseModel):
    id: str
    name: str
    participants: List[str]


class RoomResponse(BaseModel):
    id: str
    name: str
    status: RoomStatus
    legal_hold: bool


class InviteRequest(BaseModel):
    invitee_id: str


class ArtifactCreate(BaseModel):
    artifact_id: str
    name: str
    classification: Classification = Classification.confidential
    content: str


class ArtifactUpdate(BaseModel):
    content: str
    classification: Optional[Classification] = None


class ArtifactVersionResponse(BaseModel):
    digest: str
    prev_digest: Optional[str]
    version: int
    author_id: str
    created_at: str
    classification: Classification


class EvidenceExportRequest(BaseModel):
    room_id: str
    include_confidential: bool = False


class AuditEventFilter(BaseModel):
    actor_id: Optional[str] = None
    resource_id: Optional[str] = None
    decision: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    limit: int = Field(default=50, le=200)


class ReplayResult(BaseModel):
    state_hash: str
    events_processed: int


class OracleFactRequest(BaseModel):
    subject_id: str
    fact_type: str
    payload: dict


class TrustRegistryUpdate(BaseModel):
    user_id: str
    vc_status: str
    expires_at: Optional[str] = None
    revoked: bool = False


class RevalidateRequest(BaseModel):
    user_id: str


class KeyRotationResponse(BaseModel):
    key_id: str
    created_at: str


class AuditEventResponse(BaseModel):
    event_id: str
    timestamp: str
    actor_id: str
    action: str
    resource_type: str
    resource_id: str
    decision: str
    why: dict
    what: dict
    denial_reason: Optional[str]


class VerificationReport(BaseModel):
    verified: bool
    message: str
    details: dict
