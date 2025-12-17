"""Adapters that send plans back to the real world."""
from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Dict


class RealAdapter(ABC):
    @abstractmethod
    def send_plan(self, source_id: str, plan: Dict[str, object]) -> str:
        """Return status string."""


class ConsoleAdapter(RealAdapter):
    def send_plan(self, source_id: str, plan: Dict[str, object]) -> str:
        message = f"[ConsoleAdapter] Sending plan for {source_id}: {plan}"
        print(message)
        return "sent"
