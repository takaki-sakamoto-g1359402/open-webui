"""Tiny optimizer placeholder for tuning planner parameters."""
from __future__ import annotations

import random
from typing import Dict

from .models import OptimizationResult, WorldStateV


class RandomTuner:
    """Perturbs a single parameter to simulate optimization."""

    def __init__(self, parameter_key: str = "planner_step", step: float = 0.1) -> None:
        self.parameter_key = parameter_key
        self.step = step

    def optimize(self, world: WorldStateV) -> OptimizationResult:
        current_value = world.parameters.get(self.parameter_key, 1.0)
        delta = random.uniform(-self.step, self.step)
        tuned = max(0.1, current_value + delta)
        tuned_parameters: Dict[str, float] = {self.parameter_key: tuned}
        score = 1.0 / tuned  # arbitrary scoring to keep deterministic direction
        return OptimizationResult(tuned_parameters=tuned_parameters, score=score, iterations=1, notes="random walk")
