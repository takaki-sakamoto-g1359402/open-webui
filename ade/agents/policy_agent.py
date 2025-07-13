"""PolicyAgent implementation."""

from __future__ import annotations

import logging
from typing import Any, List

from .base import AgentBase

logger = logging.getLogger(__name__)


class PolicyAgent(AgentBase):
    """Agent suggesting best actions for scenarios."""

    def plan(self) -> List[str]:
        """Return a list of proposed actions."""
        # TODO: integrate LLM for real planning
        actions = ["increase surveillance", "allocate resources"]
        logger.info("%s planned actions: %s", self.name, actions)
        return actions

    def act(self, plan: List[str]) -> List[str]:
        """Execute policy plan (stub)."""
        logger.info("%s executing plan", self.name)
        # Stub simply returns the plan
        return plan
