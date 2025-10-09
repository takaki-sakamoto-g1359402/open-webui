"""Agent orchestrator."""
from __future__ import annotations

from typing import Dict, List

from .executor import Executor
from .learner import Learner
from .memory import MemoryStore
from .planner import Planner
from .reflector import Reflector
from .safety import SafetyGuard
from .utils.logging import get_logger
from .utils.scoring import compute_score
from .utils.types import Observation, Plan, Step


class Agent:
    """Coordinates the Plan → Act → Reflect → Learn cycle."""

    def __init__(
        self,
        planner: Planner,
        executor: Executor,
        reflector: Reflector,
        learner: Learner,
        memory_store: MemoryStore,
        safety: SafetyGuard,
        logger,
    ) -> None:
        self.planner = planner
        self.executor = executor
        self.reflector = reflector
        self.learner = learner
        self.memory_store = memory_store
        self.safety = safety
        self.logger = logger or get_logger("riai.agent")

    def run(self, goal: str, max_steps: int, budget_tokens: int) -> Dict[str, object]:
        working_memory: Dict[str, object] = {"goal": goal}
        plan = self.planner.plan(goal)
        working_memory["plan"] = plan.model_dump()
        observations: List[Observation] = []
        steps_taken = 0
        for subgoal in plan.subgoals:
            for step in subgoal.steps:
                if steps_taken >= max_steps:
                    self.logger.info("Max steps reached", extra={"max_steps": max_steps})
                    break
                observation = self.executor.execute(step)
                observations.append(observation)
                reflection = self.reflector.reflect(step, observation, working_memory)
                working_memory[f"reflection_{step.id}"] = reflection
                steps_taken += 1
                if not observation.success and reflection.get("needs_replan"):
                    plan = self.planner.replan(goal, step)
                    working_memory["plan"] = plan.model_dump()
                    break
            else:
                continue
            break
        self.learner.store_episode(plan, observations)
        metrics = compute_score(observations, max_steps)
        return {
            "goal": goal,
            "plan": plan.model_dump(),
            "observations": [obs.model_dump() for obs in observations],
            "metrics": metrics,
            "working_memory": working_memory,
            "steps_taken": steps_taken,
        }

