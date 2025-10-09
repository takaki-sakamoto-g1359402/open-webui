"""Simple scoring helpers."""
from __future__ import annotations

from typing import Dict

from .types import Observation


def compute_score(observations: list[Observation], max_steps: int) -> Dict[str, float]:
    """Compute simple success metrics."""
    success_steps = sum(1 for obs in observations if obs.success)
    total_steps = len(observations)
    return {
        "success_rate": success_steps / total_steps if total_steps else 0.0,
        "steps_used": float(total_steps),
        "steps_budget": float(max_steps),
    }
