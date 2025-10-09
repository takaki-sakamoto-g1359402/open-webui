"""Reflection component."""
from __future__ import annotations

from typing import Dict

from .utils.types import Observation, Step


class Reflector:
    """Analyzes observations and proposes adjustments."""

    def reflect(self, step: Step, observation: Observation, working_memory: Dict[str, str]) -> Dict[str, str | bool]:
        if observation.success:
            summary = f"Step {step.id} succeeded."
            needs_replan = False
        else:
            summary = f"Step {step.id} failed: {observation.error}"
            needs_replan = True
        working_memory[f"reflection_{step.id}"] = summary
        return {"summary": summary, "needs_replan": needs_replan}

