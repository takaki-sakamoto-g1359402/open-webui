from datetime import datetime
from pathlib import Path
import sys

import pytest

sys.path.append(str(Path(__file__).resolve().parents[1]))

from fleet_core.models import RobotSpec, Task, TaskType, WorldStateV, RobotState, EnvironmentMetadata


def test_robot_spec_validation():
    spec = RobotSpec(robot_id="h1", max_velocity=1.0, payload_capacity=5.0)
    assert spec.model == "generic-humanoid"


def test_task_requires_xyz_target():
    with pytest.raises(ValueError):
        Task(robot_id="h1", task_type=TaskType.MOVE, target=[0, 1])


def test_world_state_serialization():
    robot = RobotState(robot_id="h1", position=[0, 0, 0])
    world = WorldStateV(timestamp=datetime.utcnow(), robots=[robot], environment=EnvironmentMetadata())
    assert world.environment.gravity == 9.81
    data = world.model_dump()
    assert data["robots"][0]["position"] == [0, 0, 0]


