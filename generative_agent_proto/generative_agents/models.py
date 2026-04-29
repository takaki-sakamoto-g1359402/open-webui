"""Shared dataclasses and enums for the generative-agent prototype."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import date, datetime, time, timedelta, timezone
from enum import Enum
from typing import Any
from uuid import uuid4


def utc_now() -> datetime:
    """Return timezone-aware UTC time."""

    return datetime.now(timezone.utc)


def make_id(prefix: str) -> str:
    """Create a compact readable identifier."""

    return f"{prefix}_{uuid4().hex[:12]}"


def parse_datetime(value: str | datetime | None) -> datetime | None:
    """Parse ISO datetime values used in persisted JSON."""

    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    parsed = datetime.fromisoformat(value)
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed


def serialize_datetime(value: datetime | None) -> str | None:
    """Serialize datetimes consistently for JSONL persistence."""

    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.isoformat()


class MemoryType(str, Enum):
    """Supported memory record categories."""

    OBSERVATION = "observation"
    REFLECTION = "reflection"
    PLAN = "plan"
    POSTMORTEM = "postmortem"
    HEURISTIC = "heuristic"
    SEMANTIC = "semantic"
    PROCEDURAL = "procedural"


class ReflectionStatus(str, Enum):
    """Lifecycle for reflection memories."""

    ACTIVE = "active"
    NEEDS_REVIEW = "needs_review"
    DEPRECATED = "deprecated"


class PlanItemStatus(str, Enum):
    """Simple status model for plan execution."""

    PENDING = "pending"
    ACTIVE = "active"
    COMPLETED = "completed"
    MODIFIED = "modified"
    ABANDONED = "abandoned"


class ReconsiderationDecision(str, Enum):
    """Decision options for goal and plan reconsideration."""

    CONTINUE = "continue_current_plan"
    MODIFY = "modify_current_plan"
    ABANDON = "abandon_current_plan"
    CREATE_NEW = "create_new_plan"


@dataclass
class AgentProfile:
    """Explicit pseudo-personality and task preferences for one agent."""

    agent_id: str
    name: str
    traits: list[str] = field(default_factory=list)
    goals: list[str] = field(default_factory=list)
    role_affinities: list[str] = field(default_factory=list)
    boundaries: list[str] = field(default_factory=list)
    priorities: dict[str, float] = field(default_factory=dict)


@dataclass
class EnvironmentEvent:
    """Shared event emitted by the local environment."""

    id: str
    description: str
    location: str
    created_at: datetime
    importance_hint: float = 0.5
    tags: list[str] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)

    @classmethod
    def create(
        cls,
        description: str,
        location: str,
        *,
        created_at: datetime | None = None,
        importance_hint: float = 0.5,
        tags: list[str] | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> "EnvironmentEvent":
        return cls(
            id=make_id("evt"),
            description=description,
            location=location,
            created_at=created_at or utc_now(),
            importance_hint=importance_hint,
            tags=tags or [],
            metadata=metadata or {},
        )

    def to_dict(self) -> dict[str, Any]:
        data = asdict(self)
        data["created_at"] = serialize_datetime(self.created_at)
        return data


@dataclass
class MemoryRecord:
    """A single memory stream record.

    Reflections are valid only when ``supporting_memory_ids`` is non-empty.
    That grounding rule prevents completely unsupported self-narratives from
    silently entering long-term memory.
    """

    id: str
    agent_id: str
    memory_type: MemoryType
    content: str
    created_at: datetime
    importance: float = 0.5
    metadata: dict[str, Any] = field(default_factory=dict)
    confidence: float | None = None
    supporting_memory_ids: list[str] = field(default_factory=list)
    review_at: datetime | None = None
    status: ReflectionStatus | None = None
    last_accessed_at: datetime | None = None
    access_count: int = 0

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "agent_id": self.agent_id,
            "memory_type": self.memory_type.value,
            "content": self.content,
            "created_at": serialize_datetime(self.created_at),
            "importance": self.importance,
            "metadata": self.metadata,
            "confidence": self.confidence,
            "supporting_memory_ids": list(self.supporting_memory_ids),
            "review_at": serialize_datetime(self.review_at),
            "status": self.status.value if self.status else None,
            "last_accessed_at": serialize_datetime(self.last_accessed_at),
            "access_count": self.access_count,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "MemoryRecord":
        status_value = data.get("status")
        status = ReflectionStatus(status_value) if status_value else None
        return cls(
            id=data["id"],
            agent_id=data["agent_id"],
            memory_type=MemoryType(data["memory_type"]),
            content=data["content"],
            created_at=parse_datetime(data["created_at"]) or utc_now(),
            importance=float(data.get("importance", 0.5)),
            metadata=dict(data.get("metadata", {})),
            confidence=data.get("confidence"),
            supporting_memory_ids=list(data.get("supporting_memory_ids", [])),
            review_at=parse_datetime(data.get("review_at")),
            status=status,
            last_accessed_at=parse_datetime(data.get("last_accessed_at")),
            access_count=int(data.get("access_count", 0)),
        )

    def mark_accessed(self, when: datetime | None = None) -> None:
        self.last_accessed_at = when or utc_now()
        self.access_count += 1


@dataclass
class PlanItem:
    """Concrete scheduled task in an agent's daily plan."""

    id: str
    task: str
    location: str
    start_time: datetime
    duration_minutes: int
    status: PlanItemStatus = PlanItemStatus.PENDING
    related_memory_ids: list[str] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)

    @property
    def end_time(self) -> datetime:
        return self.start_time + timedelta(minutes=self.duration_minutes)

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "task": self.task,
            "location": self.location,
            "start_time": serialize_datetime(self.start_time),
            "duration_minutes": self.duration_minutes,
            "status": self.status.value,
            "related_memory_ids": list(self.related_memory_ids),
            "metadata": self.metadata,
        }


@dataclass
class DailyPlan:
    """High-level daily plan decomposed into concrete plan items."""

    id: str
    agent_id: str
    date: date
    summary: str
    items: list[PlanItem]
    created_at: datetime
    updated_at: datetime

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "agent_id": self.agent_id,
            "date": self.date.isoformat(),
            "summary": self.summary,
            "items": [item.to_dict() for item in self.items],
            "created_at": serialize_datetime(self.created_at),
            "updated_at": serialize_datetime(self.updated_at),
        }


@dataclass
class ActionResult:
    """Outcome of one attempted action."""

    agent_id: str
    action: str
    success: bool
    outcome: str
    location: str
    created_at: datetime
    related_plan_item_id: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class Trajectory:
    """Reusable record of an attempted task and its outcome."""

    id: str
    agent_id: str
    task: str
    steps: list[str]
    success: bool
    outcome: str
    created_at: datetime
    related_memory_ids: list[str] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)


def default_day_start(target_date: date, hour: int = 9) -> datetime:
    """Return a deterministic day-start time for demos and tests."""

    return datetime.combine(target_date, time(hour=hour), tzinfo=timezone.utc)
