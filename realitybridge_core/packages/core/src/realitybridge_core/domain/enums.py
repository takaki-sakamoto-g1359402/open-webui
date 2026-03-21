from enum import Enum


class StringEnum(str, Enum):
    pass


class IdentityType(StringEnum):
    USER = "user"
    OPERATOR = "operator"
    ADMIN = "admin"
    AGENT = "agent"
    DEVICE = "device"


class SessionStatus(StringEnum):
    ACTIVE = "active"
    PAUSED = "paused"
    ENDED = "ended"


class ParticipantRole(StringEnum):
    HUMAN = "human"
    AGENT = "agent"
    OBSERVER = "observer"
    DEVICE = "device"


class TwinType(StringEnum):
    ROOM = "room"
    FACILITY = "facility"
    ASSET = "asset"
    ORGANIZATION = "organization"
    PERSONA = "persona"


class AgentStatus(StringEnum):
    REGISTERED = "registered"
    AVAILABLE = "available"
    DISABLED = "disabled"


class TaskState(StringEnum):
    SUBMITTED = "submitted"
    POLICY_PENDING = "policy_pending"
    APPROVED = "approved"
    DENIED = "denied"
    EXECUTING = "executing"
    COMPLETED = "completed"
    FAILED = "failed"
    SIMULATED = "simulated"


class PolicyEffect(StringEnum):
    ALLOW = "allow"
    DENY = "deny"
    CONDITIONAL = "conditional"


class PolicyDecisionOutcome(StringEnum):
    APPROVED = "approved"
    DENIED = "denied"
    CONDITIONAL = "conditional"


class DeviceType(StringEnum):
    ROBOT = "robot"
    EDGE = "edge"
    SENSOR = "sensor"
    HUMANOID = "humanoid"


class BridgeMode(StringEnum):
    SIMULATION = "simulation"
    BLOCKED = "blocked"
    PHYSICAL = "physical"


class AuditSeverity(StringEnum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"
