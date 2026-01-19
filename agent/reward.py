"""Hybrid reward computation for episodes."""
from __future__ import annotations

from dataclasses import dataclass


@dataclass
class RewardSignals:
    extrinsic: float
    novelty: float
    mastery: float
    coherence: float
    efficiency: float

    def as_dict(self) -> dict:
        return {
            "extrinsic": self.extrinsic,
            "novelty": self.novelty,
            "mastery": self.mastery,
            "coherence": self.coherence,
            "efficiency": self.efficiency,
        }


class RewardEngine:
    """Compute intrinsic and extrinsic reward signals."""

    def __init__(self, identity_goal: str):
        self.identity_goal = identity_goal.lower()

    def compute(
        self,
        *,
        success: bool,
        task: str,
        steps_used: int,
        reused_trace: bool,
    ) -> RewardSignals:
        extrinsic = 1.0 if success else 0.0
        novelty = 0.2 if reused_trace else 0.6
        mastery = max(0.0, 1.0 - steps_used * 0.1)
        coherence = 0.7 if any(word in task.lower() for word in self.identity_goal.split()) else 0.4
        efficiency = max(0.0, 1.0 - steps_used * 0.15)
        return RewardSignals(
            extrinsic=extrinsic,
            novelty=novelty,
            mastery=mastery,
            coherence=coherence,
            efficiency=efficiency,
        )
