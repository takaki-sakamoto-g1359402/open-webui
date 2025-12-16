"""Mock adapter emulating the real world using the toy simulator with noise."""
from __future__ import annotations

import random
from datetime import datetime
from typing import List

from fleet_core.models import (
    ActionPlan,
    EnvironmentMetadata,
    RobotState,
    RobotStatus,
    Telemetry,
    WorldStateR,
    WorldStateV,
)
from sim_v.env import VirtualEnv

from .base import RealWorldAdapter


class MockRealWorldAdapter(RealWorldAdapter):
    """Uses an internal virtual environment as a stand-in for hardware."""

    def __init__(self, virtual_env: VirtualEnv, noise: float = 0.05) -> None:
        self.virtual_env = virtual_env
        self.noise = noise

    def sync_from_virtual(self, world_v: WorldStateV) -> WorldStateR:
        noisy_robots: List[RobotState] = []
        for robot in world_v.robots:
            noisy_position = [coord + random.uniform(-self.noise, self.noise) for coord in robot.position]
            noisy_robots.append(
                RobotState(
                    robot_id=robot.robot_id,
                    position=noisy_position,
                    status=RobotStatus.IDLE,
                    current_task=None,
                )
            )
        return WorldStateR(timestamp=datetime.utcnow(), robots=noisy_robots, environment=world_v.environment)

    def execute_plan(self, plan: ActionPlan) -> Telemetry:
        robot_states: List[RobotState] = []
        for task in plan.tasks:
            # reuse virtual env to simulate execution
            agent = self.virtual_env.agents[task.robot_id]
            updated_state = agent.apply_task(task)
            # add measurement noise
            noisy_position = [coord + random.uniform(-self.noise, self.noise) for coord in updated_state.position]
            robot_states.append(
                RobotState(
                    robot_id=updated_state.robot_id,
                    position=noisy_position,
                    status=updated_state.status,
                    current_task=updated_state.current_task,
                )
            )
        events = [f"executed {len(plan.tasks)} tasks"]
        return Telemetry(received_at=datetime.utcnow(), robot_updates=robot_states, events=events)
