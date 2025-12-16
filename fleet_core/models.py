"""Core data models for the humanoid fleet management system."""
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional

from pydantic import BaseModel, Field, field_validator


class RobotStatus(str, Enum):
    """Lifecycle of a robot during task execution."""

    IDLE = "IDLE"
    EXECUTING = "EXECUTING"
    FAILED = "FAILED"
    COMPLETED = "COMPLETED"


class TaskType(str, Enum):
    """Simplified task primitives for a humanoid."""

    MOVE = "MOVE"
    PICK = "PICK"
    PLACE = "PLACE"


class RobotSpec(BaseModel):
    """Static capabilities of a humanoid robot."""

    robot_id: str
    max_velocity: float = Field(..., gt=0)
    payload_capacity: float = Field(..., gt=0)
    model: str = "generic-humanoid"


class Task(BaseModel):
    """Single task action."""

    robot_id: str
    task_type: TaskType
    target: List[float] = Field(..., description="Target position or resource location")
    metadata: Dict[str, float] = Field(default_factory=dict)

    @field_validator("target")
    @classmethod
    def target_has_three_coordinates(cls, value: List[float]) -> List[float]:
        if len(value) != 3:
            raise ValueError("target must be [x, y, z]")
        return value


class ActionPlan(BaseModel):
    """Plan consisting of per-robot tasks."""

    plan_id: str
    tasks: List[Task]
    created_at: datetime = Field(default_factory=datetime.utcnow)
    approved: bool = False


class RobotState(BaseModel):
    """State shared by both virtual and real worlds."""

    robot_id: str
    position: List[float] = Field(..., description="[x, y, z] position")
    status: RobotStatus = RobotStatus.IDLE
    current_task: Optional[TaskType] = None

    @field_validator("position")
    @classmethod
    def position_is_xyz(cls, value: List[float]) -> List[float]:
        if len(value) != 3:
            raise ValueError("position must be [x, y, z]")
        return value


class EnvironmentMetadata(BaseModel):
    """Extensible metadata for planets, stations, etc."""

    gravity: float = 9.81
    atmosphere: str = "earth-like"
    terrain: str = "flat"


class WorldStateV(BaseModel):
    """Virtual world representation."""

    timestamp: datetime
    robots: List[RobotState]
    environment: EnvironmentMetadata
    parameters: Dict[str, float] = Field(default_factory=dict)


class WorldStateR(BaseModel):
    """Real-world sensed state."""

    timestamp: datetime
    robots: List[RobotState]
    environment: EnvironmentMetadata


class Telemetry(BaseModel):
    """Execution report from the real world."""

    received_at: datetime
    robot_updates: List[RobotState]
    events: List[str] = Field(default_factory=list)


class OptimizationResult(BaseModel):
    """Result of an optimization pass."""

    tuned_parameters: Dict[str, float]
    score: float
    iterations: int
    notes: str = ""
