"""SimAgent implementation."""

from __future__ import annotations

import logging
from typing import List
import random

from .base import AgentBase

logger = logging.getLogger(__name__)


class SimAgent(AgentBase):
    """Agent that runs Monte-Carlo scenario simulations."""

    def plan(self) -> List[str]:
        """Return simulation outcomes."""
        outcomes = [f"outcome_{i}" for i in range(3)]
        logger.info("%s simulated outcomes: %s", self.name, outcomes)
        return outcomes

    def act(self, plan: List[str]) -> List[str]:
        """Execute simulations (stub)."""
        logger.info("%s running simulations", self.name)
        random.shuffle(plan)
        return plan
