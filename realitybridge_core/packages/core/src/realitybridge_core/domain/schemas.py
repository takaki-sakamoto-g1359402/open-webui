from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import AliasChoices, BaseModel, ConfigDict, Field

from realitybridge_core.domain.enums import (
    AgentStatus,
    BridgeMode,
    DeviceType,
    IdentityType,
    ParticipantRole,
    PolicyDecisionOutcome,
    PolicyEffect,
    SessionStatus,
    TaskState,
    TwinType,
)


class APIModel(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    email: str
    password: str


class RoleRead(APIModel):
    id: str
    name: str
    description: str


class UserCreate(BaseModel):
    email: str
    full_name: str
    password: str = Field(min_length=8)
    role_name: str = "operator"
    identity_type: IdentityType = IdentityType.USER


class UserRead(APIModel):
    id: str
    email: str
    full_name: str
    identity_type: str
    is_active: bool
    role: RoleRead


class SpaceCreate(BaseModel):
    name: str
    description: str = ""
    metadata: dict[str, Any] = Field(default_factory=dict)


class SpaceRead(APIModel):
    id: str
    name: str
    description: str
    metadata: dict[str, Any] = Field(validation_alias=AliasChoices("meta", "metadata"))
    owner_id: str


class SessionCreate(BaseModel):
    space_id: str
    metadata: dict[str, Any] = Field(default_factory=dict)


class SessionRead(APIModel):
    id: str
    space_id: str
    started_by_id: str
    status: str
    metadata: dict[str, Any] = Field(validation_alias=AliasChoices("meta", "metadata"))


class ParticipantCreate(BaseModel):
    subject_type: IdentityType
    subject_id: str
    role: ParticipantRole = ParticipantRole.HUMAN
    metadata: dict[str, Any] = Field(default_factory=dict)


class ParticipantRead(APIModel):
    id: str
    session_id: str
    subject_type: str
    subject_id: str
    role: str
    metadata: dict[str, Any] = Field(validation_alias=AliasChoices("meta", "metadata"))


class DigitalTwinCreate(BaseModel):
    space_id: str
    name: str
    twin_type: TwinType = TwinType.ASSET
    source_ref: str = ""
    metadata: dict[str, Any] = Field(default_factory=dict)


class DigitalTwinRead(APIModel):
    id: str
    space_id: str
    name: str
    twin_type: str
    source_ref: str
    metadata: dict[str, Any] = Field(validation_alias=AliasChoices("meta", "metadata"))


class AgentCreate(BaseModel):
    name: str
    description: str = ""
    capabilities: dict[str, Any] = Field(default_factory=dict)
    metadata: dict[str, Any] = Field(default_factory=dict)


class AgentRead(APIModel):
    id: str
    name: str
    description: str
    status: AgentStatus
    capabilities: dict[str, Any]
    metadata: dict[str, Any] = Field(validation_alias=AliasChoices("meta", "metadata"))


class TaskCreate(BaseModel):
    agent_id: str
    space_id: str | None = None
    kind: str
    description: str
    payload: dict[str, Any] = Field(default_factory=dict)
    sensitive: bool = False


class TaskRead(APIModel):
    id: str
    agent_id: str
    space_id: str | None
    submitted_by_id: str
    kind: str
    description: str
    payload: dict[str, Any]
    state: TaskState
    sensitive: bool


class TaskRunRead(APIModel):
    id: str
    task_id: str
    execution_mode: str
    state: TaskState
    logs: dict[str, Any]
    result: dict[str, Any]


class PolicyCreate(BaseModel):
    name: str
    description: str = ""
    effect: PolicyEffect = PolicyEffect.CONDITIONAL
    applies_to: str
    rules: dict[str, Any] = Field(default_factory=dict)
    active: bool = True


class PolicyRead(APIModel):
    id: str
    name: str
    description: str
    effect: PolicyEffect
    applies_to: str
    rules: dict[str, Any]
    active: bool


class PolicyDecisionRead(APIModel):
    id: str
    policy_id: str | None
    task_id: str | None
    subject_type: str
    subject_id: str
    outcome: PolicyDecisionOutcome
    rationale: str
    context: dict[str, Any]


class DeviceCreate(BaseModel):
    space_id: str | None = None
    name: str
    device_type: DeviceType = DeviceType.ROBOT
    metadata: dict[str, Any] = Field(default_factory=dict)


class DeviceRead(APIModel):
    id: str
    space_id: str | None
    name: str
    device_type: DeviceType
    metadata: dict[str, Any] = Field(validation_alias=AliasChoices("meta", "metadata"))
    is_enabled: bool


class RobotBridgeCreate(BaseModel):
    device_id: str
    name: str
    mode: BridgeMode = BridgeMode.SIMULATION
    adapter: str = "simulated-bridge"
    metadata: dict[str, Any] = Field(default_factory=dict)


class RobotBridgeRead(APIModel):
    id: str
    device_id: str
    name: str
    mode: BridgeMode
    adapter: str
    metadata: dict[str, Any] = Field(validation_alias=AliasChoices("meta", "metadata"))


class AuditLogRead(APIModel):
    id: str
    actor_type: str
    actor_id: str
    action: str
    target_type: str
    target_id: str
    severity: str
    request_id: str
    correlation_id: str
    details: dict[str, Any]
    created_at: datetime


class HealthResponse(BaseModel):
    status: str
    app: str
    simulation_mode: bool


class ReadinessResponse(BaseModel):
    status: str
    database: str
    redis: str
