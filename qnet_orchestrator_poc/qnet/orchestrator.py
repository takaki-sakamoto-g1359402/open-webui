"""Plan-Act-Reflect orchestrator."""

from __future__ import annotations

from dataclasses import dataclass
import numpy as np

from .scheduler import plan_route, execute_plan, ExecutionReport
from .entanglement import EntanglementParams
from .tasks import QuantumTask
from .network import QuantumNetwork


@dataclass
class OrchestratorConfig:
    retry_budget: int = 3
    allow_satellite: bool = True


class Orchestrator:
    def __init__(self, network: QuantumNetwork, params: EntanglementParams | None = None, config: OrchestratorConfig | None = None) -> None:
        self.network = network
        self.params = params or EntanglementParams()
        self.config = config or OrchestratorConfig()
        self.rng = np.random.default_rng()

    def run_task(self, task: QuantumTask) -> ExecutionReport:
        budget = self.config.retry_budget
        allow_satellite = self.config.allow_satellite
        last_report: ExecutionReport | None = None
        while budget > 0:
            plan = plan_route(task, self.network, self.params, allow_satellite=allow_satellite)
            report = execute_plan(plan, task, self.rng, self.params)
            if report.success:
                return report
            budget -= 1
            allow_satellite = True  # enable satellite after first failure
            # adjust strategy
            if plan.strategy == "sequential":
                plan.strategy = "parallel"
            else:
                plan.strategy = "mpses"
            last_report = report
        return last_report or report
