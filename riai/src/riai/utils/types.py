"""Typed models for Riai."""
from __future__ import annotations

import enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class StepType(str, enum.Enum):
    """Types of steps in a plan."""

    THINK = "think"
    TOOL = "tool"
    REFLECT = "reflect"
    LEARN = "learn"


class Step(BaseModel):
    """A single step in a plan."""

    id: str
    description: str
    type: StepType = StepType.TOOL
    tool: Optional[str] = None
    inputs: Dict[str, Any] = Field(default_factory=dict)
    parent: Optional[str] = None


class Subgoal(BaseModel):
    """A subgoal containing multiple steps."""

    id: str
    description: str
    steps: List[Step] = Field(default_factory=list)


class Plan(BaseModel):
    """Structured plan for a goal."""

    goal: str
    subgoals: List[Subgoal]
    metadata: Dict[str, Any] = Field(default_factory=dict)


class Observation(BaseModel):
    """Observation from executing a step."""

    step_id: str
    success: bool
    output: str
    error: Optional[str] = None
    artifacts: List[str] = Field(default_factory=list)


class Violation(BaseModel):
    """Safety violation details."""

    step_id: str
    reason: str
    policy: str
    severity: str = "error"


class MemoryTrace(BaseModel):
    """An episodic memory trace."""

    plan: Plan
    observations: List[Observation]


class Skill(BaseModel):
    """Reusable skill template."""

    name: str
    description: str
    template: Dict[str, Any]
    success_count: int = 0
