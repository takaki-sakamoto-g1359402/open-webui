"""Shared local environment for multi-agent demos."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from .models import EnvironmentEvent


class SimulationEnvironment:
    """A minimal event-emitting environment shared by multiple agents."""

    def __init__(self, name: str = "Local Sandbox") -> None:
        self.name = name
        self.event_log: list[EnvironmentEvent] = []

    def emit_event(
        self,
        description: str,
        location: str,
        *,
        created_at: datetime | None = None,
        importance_hint: float = 0.5,
        tags: list[str] | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> EnvironmentEvent:
        event = EnvironmentEvent.create(
            description,
            location,
            created_at=created_at,
            importance_hint=importance_hint,
            tags=tags,
            metadata=metadata,
        )
        self.event_log.append(event)
        return event

    def shared_events(self) -> list[EnvironmentEvent]:
        return list(self.event_log)

    def group_reflection_placeholder(self) -> str:
        """Placeholder for future COPPER-style group reflection.

        Credit assignment is hard in collaboration because group outcomes are
        caused by interacting actions, timing, communication, hidden state, and
        environmental conditions. A later implementation should separate
        individual evidence, shared evidence, role obligations, and causal
        uncertainty before reinforcing any one agent's memory.
        """

        return "Group reflection is a future extension; individual memories remain separate in v0."
