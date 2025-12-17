"""Planner generating candidate plans and scoring."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Tuple

from .quantum_sandbox import QuantumSandbox


@dataclass
class Plan:
    name: str
    params: Dict[str, float]

    def as_dict(self) -> Dict[str, object]:
        return {"name": self.name, "params": self.params}


@dataclass
class PlanEvaluation:
    plan: Plan
    score: float


class Planner:
    def __init__(self, quantum: QuantumSandbox | None = None):
        self.quantum = quantum or QuantumSandbox()

    def candidates(self, twin_state: Dict[str, object]) -> List[Plan]:
        metrics = twin_state.get("metrics", {})
        metric_value = float(next(iter(metrics.values()), 0.0))
        return [
            Plan("increase_sampling", {"delta": 0.1}),
            Plan("decrease_sampling", {"delta": -0.1}),
            Plan("hold", {"delta": 0.0, "baseline": metric_value}),
        ]

    def evaluate(self, twin_state: Dict[str, object], telemetry_metrics: Dict[str, float]) -> Tuple[List[PlanEvaluation], PlanEvaluation]:
        plans = self.candidates(twin_state)
        evaluations: List[PlanEvaluation] = []

        baseline = float(next(iter(telemetry_metrics.values()), 0.0))
        for plan in plans:
            delta = plan.params.get("delta", 0.0)
            score = baseline - abs(delta)
            score += self.quantum.epsilon()
            evaluations.append(PlanEvaluation(plan=plan, score=score))

        best = max(evaluations, key=lambda ev: ev.score)
        return evaluations, best
