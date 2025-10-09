"""Hierarchical planner."""
from __future__ import annotations

import hashlib
from typing import Optional

from .learner import Learner
from .memory import MemoryStore
from .utils.types import Plan, Step, StepType, Subgoal


class Planner:
    """Template-based hierarchical planner."""

    def __init__(self, seed: int = 0, memory: Optional[MemoryStore] = None, learner: Optional[Learner] = None) -> None:
        self.seed = seed
        self.memory = memory
        self.learner = learner

    def _id(self, goal: str, suffix: str) -> str:
        digest = hashlib.sha256(f"{self.seed}:{goal}:{suffix}".encode()).hexdigest()
        return digest[:8]

    def plan(self, goal: str) -> Plan:
        """Create a deterministic plan."""
        understand_id = self._id(goal, "understand")
        execute_id = self._id(goal, "execute")
        review_id = self._id(goal, "review")

        subgoal_understand = Subgoal(
            id=understand_id,
            description=f"Understand goal: {goal}",
            steps=[
                Step(
                    id=f"{understand_id}-1",
                    description="Clarify the expected outcome and constraints",
                    type=StepType.THINK,
                    tool=None,
                ),
            ],
        )

        steps_execute = [
            Step(
                id=f"{execute_id}-1",
                description="Gather relevant context from local files",
                type=StepType.TOOL,
                tool="filesystem",
                inputs={"action": "list", "path": "."},
                parent=understand_id,
            ),
            Step(
                id=f"{execute_id}-2",
                description="Perform main analysis using Python if required",
                type=StepType.TOOL,
                tool="python_exec",
                inputs={"code": "# Write analysis code and assign to result"},
                parent=understand_id,
            ),
        ]
        subgoal_execute = Subgoal(id=execute_id, description="Execute actionable steps", steps=steps_execute)

        subgoal_review = Subgoal(
            id=review_id,
            description="Review results and reflect",
            steps=[
                Step(
                    id=f"{review_id}-1",
                    description="Summarize outcomes and check for gaps",
                    type=StepType.REFLECT,
                    tool=None,
                )
            ],
        )

        return Plan(goal=goal, subgoals=[subgoal_understand, subgoal_execute, subgoal_review], metadata={"seed": self.seed})

    def replan(self, goal: str, failed_step: Step) -> Plan:
        """Fallback re-planning strategy: regenerate plan."""
        return self.plan(goal)

