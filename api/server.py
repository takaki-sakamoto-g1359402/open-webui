"""HTTP API for triggering V→R→V cycles and inspecting state."""
from __future__ import annotations

from pathlib import Path
from typing import Any, Dict

import uvicorn
import yaml
from fastapi import FastAPI

from fleet_core.models import RobotSpec
from fleet_core.orchestrator import Orchestrator
from fleet_core.planning import SimplePlanner
from fleet_core.optimization import RandomTuner
from real_r.adapters.mock import MockRealWorldAdapter
from sim_v.env import VirtualEnv

SETTINGS_PATH = Path(__file__).resolve().parent.parent / "config" / "settings.yaml"


def load_settings() -> Dict[str, Any]:
    with SETTINGS_PATH.open() as fh:
        return yaml.safe_load(fh)


def build_orchestrator() -> Orchestrator:
    settings = load_settings()
    specs = [RobotSpec(**spec) for spec in settings.get("robots", [])]
    env = VirtualEnv(specs)
    planner = SimplePlanner(step_size=env.parameters.get("planner_step", 1.0))
    adapter = MockRealWorldAdapter(env)
    optimizer = RandomTuner()
    return Orchestrator(env=env, adapter=adapter, planner=planner, optimizer=optimizer)


app = FastAPI(title="Humanoid Fleet Management")
orchestrator = build_orchestrator()


@app.get("/state/virtual")
def get_virtual_state():
    return orchestrator.env.get_state().model_dump()


@app.get("/state/real")
def get_real_state():
    if orchestrator.last_world_r:
        return orchestrator.last_world_r.model_dump()
    return {}


@app.get("/robots")
def list_robots():
    return orchestrator.env.get_state().model_dump()["robots"]


@app.post("/cycle")
def run_cycle():
    updated = orchestrator.run_cycle()
    return updated.model_dump()


def main() -> None:
    uvicorn.run(app, host="0.0.0.0", port=8000)


if __name__ == "__main__":
    main()
