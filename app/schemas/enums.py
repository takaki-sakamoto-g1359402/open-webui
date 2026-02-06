from __future__ import annotations

from enum import Enum, IntEnum


class PermissionLevel(IntEnum):
    """Governance permission levels for all actions."""

    L0_OBSERVE = 0
    L1_PROPOSE = 1
    L2_EXECUTE_LOW_RISK = 2
    L3_EXECUTE_CONDITIONAL = 3
    L4_HIGH_RISK = 4


class TaskStatus(str, Enum):
    """Lifecycle states for orchestrated tasks."""

    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    HOLD = "hold"
    ESCALATED = "escalated"
    FAILED = "failed"


class ApprovalStatus(str, Enum):
    """Approval workflow states."""

    PENDING = "pending"
    APPROVED = "approved"
    DENIED = "denied"
    ALTERNATIVE_REQUESTED = "alternative_requested"
    EXPIRED = "expired"
