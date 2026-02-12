from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Any, Dict, Optional


class RiskLevel(str, Enum):
    RISK0 = "Risk0"
    RISK1 = "Risk1"
    RISK2 = "Risk2"
    RISK3 = "Risk3"


class StepStatus(str, Enum):
    PENDING = "PENDING"
    APPROVAL_REQUIRED = "APPROVAL_REQUIRED"
    EXECUTED = "EXECUTED"
    FAILED = "FAILED"


class RunStatus(str, Enum):
    CREATED = "CREATED"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    HALTED = "HALTED"


class DataClassification(str, Enum):
    PUBLIC = "Public"
    INTERNAL = "Internal"
    CONFIDENTIAL = "Confidential"
    SECRET = "Secret"


@dataclass(frozen=True)
class PlanStep:
    step_id: str
    run_id: str
    index: int
    description: str
    connector: str
    payload: Dict[str, Any]
    risk_level: RiskLevel
    classification: DataClassification = DataClassification.INTERNAL


@dataclass(frozen=True)
class ConnectorResult:
    status: str
    output: Dict[str, Any]
    external_call: bool = False
    idempotency_key: Optional[str] = None
