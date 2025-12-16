"""Toy virtual environment representing the digital twin."""
from __future__ import annotations

from datetime import datetime
from typing import Dict, List

from fleet_core.models import EnvironmentMetadata, RobotSpec, RobotState, RobotStatus, Task, WorldStateV
from .humanoid_agent import HumanoidAgent


class VirtualEnv:
    """Lightweight digital twin for a humanoid fleet."""

    def __init__(self, robot_specs: List[RobotSpec], environment: EnvironmentMetadata | None = None) -> None:
        self.environment = environment or EnvironmentMetadata()
        self.agents: Dict[str, HumanoidAgent] = {
            spec.robot_id: HumanoidAgent(
                RobotState(robot_id=spec.robot_id, position=[0.0, 0.0, 0.0], status=RobotStatus.IDLE)
            )
            for spec in robot_specs
        }
        self.parameters: Dict[str, float] = {"planner_step": 1.0}

    def get_state(self) -> WorldStateV:
        """Return a snapshot of the virtual world."""

        return WorldStateV(
            timestamp=datetime.utcnow(),
            robots=[agent.state for agent in self.agents.values()],
            environment=self.environment,
            parameters=self.parameters.copy(),
        )

    def apply_plan(self, plan: List[Task]) -> WorldStateV:
        """Apply a plan locally to visualize effects in the virtual world."""

        for task in plan:
            agent = self.agents[task.robot_id]
            agent.apply_task(task)
        return self.get_state()

    def update_from_telemetry(self, robot_states: List[RobotState]) -> None:
        """Update the virtual agents based on telemetry coming back from R."""

        for state in robot_states:
            if state.robot_id in self.agents:
                self.agents[state.robot_id].state = state

    def set_parameter(self, key: str, value: float) -> None:
        self.parameters[key] = value
