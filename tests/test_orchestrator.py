import json
import random
import sys
from pathlib import Path

import pytest

sys.path.append(str(Path(__file__).resolve().parents[1]))

import fleet_core.orchestrator as orchestrator
from fleet_core.models import RobotSpec, RobotStatus
from fleet_core.orchestrator import Orchestrator
from fleet_core.planning import SimplePlanner
from fleet_core.optimization import RandomTuner
from real_r.adapters.mock import MockRealWorldAdapter
from sim_v.env import VirtualEnv


def build_basic_orchestrator():
    specs = [RobotSpec(robot_id="r1", max_velocity=1.0, payload_capacity=1.0)]
    env = VirtualEnv(specs)
    adapter = MockRealWorldAdapter(env, noise=0.0)
    planner = SimplePlanner()
    optimizer = RandomTuner(step=0.0)
    return Orchestrator(env=env, adapter=adapter, planner=planner, optimizer=optimizer)


def test_run_cycle_updates_state(tmp_path, monkeypatch):
    random.seed(0)
    orch = build_basic_orchestrator()
    log_path = tmp_path / "fleet.jsonl"
    monkeypatch.setattr(orchestrator, "LOG_PATH", log_path)
    orchestrator.LOG_PATH.parent.mkdir(parents=True, exist_ok=True)

    updated = orch.run_cycle()
    assert all(robot.status == RobotStatus.COMPLETED for robot in updated.robots)
    assert log_path.exists()
    with log_path.open() as fh:
        logged = json.loads(fh.readline())
    assert logged["event"] == "cycle"
    assert "plan_id" in logged
