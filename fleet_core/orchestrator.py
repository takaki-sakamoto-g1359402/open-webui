"""High-level orchestration of the V→R→V control loop."""
from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Optional

from fleet_core.models import ActionPlan, WorldStateR, WorldStateV
from fleet_core.optimization import RandomTuner
from fleet_core.planning import SimplePlanner, approve_plan
from real_r.adapters.base import RealWorldAdapter
from real_r.telemetry_ingest import apply_telemetry_to_virtual
from sim_v.env import VirtualEnv

LOG_PATH = Path("runs/fleet_loop.jsonl")
LOG_PATH.parent.mkdir(parents=True, exist_ok=True)


class Orchestrator:
    """Coordinates planning, execution, and optimization between V and R."""

    def __init__(
        self,
        env: VirtualEnv,
        adapter: RealWorldAdapter,
        planner: Optional[SimplePlanner] = None,
        optimizer: Optional[RandomTuner] = None,
    ) -> None:
        self.env = env
        self.adapter = adapter
        self.planner = planner or SimplePlanner()
        self.optimizer = optimizer or RandomTuner()
        self.last_world_r: Optional[WorldStateR] = None
        self.last_plan: Optional[ActionPlan] = None

    def run_cycle(self) -> WorldStateV:
        """Run a single V→R→V cycle and return the updated virtual state."""

        world_v = self.env.get_state()
        self.planner.step_size = world_v.parameters.get("planner_step", self.planner.step_size)
        plan = self.planner.propose_plan(world_v)
        if not approve_plan(plan):
            self._log({"event": "plan_rejected", "plan_id": plan.plan_id})
            return world_v

        world_r = self.adapter.sync_from_virtual(world_v)
        telemetry = self.adapter.execute_plan(plan)
        updated_world = apply_telemetry_to_virtual(self.env, telemetry)
        optimization_result = self.optimizer.optimize(updated_world)
        for key, value in optimization_result.tuned_parameters.items():
            self.env.set_parameter(key, value)

        self.last_world_r = world_r
        self.last_plan = plan
        self._log(
            {
                "event": "cycle",
                "plan_id": plan.plan_id,
                "telemetry_events": telemetry.events,
                "parameters": updated_world.parameters,
                "optimization_score": optimization_result.score,
            }
        )
        return updated_world

    def run_forever(self, interval: float = 1.0) -> None:
        """Continuously run cycles with a sleep interval."""

        try:
            while True:
                self.run_cycle()
                time.sleep(interval)
        except KeyboardInterrupt:
            pass

    def _log(self, data: dict) -> None:
        with LOG_PATH.open("a", encoding="utf-8") as fh:
            fh.write(json.dumps(data) + "\n")
