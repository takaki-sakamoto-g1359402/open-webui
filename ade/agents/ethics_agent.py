"""EthicsAgent implementation."""

from __future__ import annotations

import logging
from typing import Dict, List

from .base import AgentBase

logger = logging.getLogger(__name__)

WEIGHTS = {
    "efficiency": 0.25,
    "cost": 0.25,
    "ethics": 0.25,
    "social_impact": 0.25,
}


class EthicsAgent(AgentBase):
    """Agent that scores actions against a value matrix."""

    def plan(self) -> List[str]:
        """Provide ethical considerations."""
        considerations = ["respect privacy", "minimize harm"]
        logger.info("%s considerations: %s", self.name, considerations)
        return considerations

    def act(self, plan: List[str]) -> List[str]:
        """Act on ethical plan (stub)."""
        logger.info("%s enforcing ethics", self.name)
        return plan

    def score_action(self, action: str, weights: Dict[str, float] | None = None) -> float:
        """Compute a composite score for an action."""
        weights = weights or WEIGHTS
        # Placeholder: random-ish scoring based on string hash
        base = sum(ord(c) for c in action) % 100
        score = sum(weights.values()) * base
        logger.info("%s scored action '%s' -> %.2f", self.name, action, score)
        return float(score)
