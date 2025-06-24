from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List


@dataclass
class _Step:
    action: Any
    reward: float


class Metacognition:
    """Track actions and rewards for simple metacognitive state."""

    def __init__(self):
        self.history: List[_Step] = []

    def get_state(self) -> Dict[str, Any]:
        total_reward = sum(step.reward for step in self.history)
        last_action = self.history[-1].action if self.history else None
        return {
            "total_steps": len(self.history),
            "total_reward": total_reward,
            "last_action": last_action,
        }

    def update(self, action: Any, reward: float) -> None:
        self.history.append(_Step(action=action, reward=reward))
