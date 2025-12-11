"""Base adapter for interfacing with the physical world."""
from __future__ import annotations

from abc import ABC, abstractmethod

from fleet_core.models import ActionPlan, Telemetry, WorldStateR, WorldStateV


class RealWorldAdapter(ABC):
    """Abstract hardware-agnostic interface."""

    @abstractmethod
    def sync_from_virtual(self, world_v: WorldStateV) -> WorldStateR:
        """Map virtual state to a real-world estimate."""

    @abstractmethod
    def execute_plan(self, plan: ActionPlan) -> Telemetry:
        """Dispatch plan to the real system and return telemetry."""
