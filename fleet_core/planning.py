"""Planning logic for generating candidate action plans in the virtual world."""
from __future__ import annotations

import itertools
import uuid
from typing import Iterable, List

from .models import ActionPlan, Task, TaskType, WorldStateV


class SimplePlanner:
    """Very small heuristic planner.

    Each robot receives one MOVE task that nudges it toward the origin. This is
    intentionally deterministic to keep the PoC predictable while leaving
    structure for more advanced algorithms later.
    """

    def __init__(self, step_size: float = 1.0) -> None:
        self.step_size = step_size
        self._plan_counter = itertools.count()

    def propose_plan(self, world: WorldStateV) -> ActionPlan:
        tasks: List[Task] = []
        for robot in world.robots:
            direction = [0 - coord for coord in robot.position]
            normalized_target = [coord + self.step_size * (d and d / abs(d)) for coord, d in zip(robot.position, direction)]
            tasks.append(
                Task(
                    robot_id=robot.robot_id,
                    task_type=TaskType.MOVE,
                    target=normalized_target,
                    metadata={"requested_step": self.step_size},
                )
            )
        plan_id = f"plan-{next(self._plan_counter)}-{uuid.uuid4().hex[:6]}"
        return ActionPlan(plan_id=plan_id, tasks=tasks)


def approve_plan(plan: ActionPlan, max_step: float = 5.0) -> bool:
    """Safety and governance stub.

    Ensures each movement request stays within a bounded step size. Real systems
    could plug in policy review workflows, simulation-based validation, or human
    approvals here.
    """

    for task in plan.tasks:
        if task.task_type == TaskType.MOVE:
            step_value = float(task.metadata.get("requested_step", 0.0))
            if step_value > max_step:
                return False
    return True
