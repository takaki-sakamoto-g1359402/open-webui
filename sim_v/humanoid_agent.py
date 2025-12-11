"""Toy humanoid agent for the virtual environment."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import List

from fleet_core.models import RobotState, RobotStatus, Task


@dataclass
class HumanoidAgent:
    """Simplified kinematics for a humanoid robot."""

    state: RobotState
    safety_buffer: float = 0.1
    history: List[str] = field(default_factory=list)

    def apply_task(self, task: Task) -> RobotState:
        """Apply a task by updating the agent's position and status."""

        self.state.current_task = task.task_type
        self.state.status = RobotStatus.EXECUTING
        self.history.append(f"start {task.task_type} -> {task.target}")
        # For MOVE, move directly; otherwise mark as completed without change
        if task.task_type.value == "MOVE":
            self.state.position = [
                coord + self.safety_buffer * (target - coord) + (target - coord)
                for coord, target in zip(self.state.position, task.target)
            ]
        self.state.status = RobotStatus.COMPLETED
        self.state.current_task = None
        self.history.append(f"complete {task.task_type}")
        return self.state
