"""Route planning and execution."""

from __future__ import annotations

from dataclasses import dataclass
from typing import List, Optional
import numpy as np

from .network import QuantumNetwork, QLink
from .entanglement import (
    EntanglementParams,
    sequential_swapping,
    parallel_segment_swapping,
    mpses_with_contention,
)
from .tasks import QuantumTask


@dataclass
class RoutePlan:
    path: List[QLink]
    strategy: str  # sequential | parallel | mpses
    via: str  # fiber | satellite | mixed
    expected_latency: float
    expected_success: float
    expected_fidelity: float


@dataclass
class ExecutionReport:
    success: bool
    attempts: int
    latency_ms: float
    fidelity: float
    strategy: str
    via: str


def _estimate_success(path: List[QLink], params: EntanglementParams) -> float:
    # crude: product of generation probabilities
    succ = 1.0
    for link in path:
        succ *= min(1.0, link.p_gen)
    return succ


def plan_route(task: QuantumTask, network: QuantumNetwork, params: EntanglementParams, allow_satellite: bool = True) -> RoutePlan:
    rng = np.random.default_rng(123)
    candidates = []
    for kind in [None, "fiber"]:
        try:
            path = network.compute_shortest_path(task.payload["src"], task.payload["dst"], kind_filter=kind)
        except Exception:
            continue
        via = "fiber" if kind == "fiber" else "mixed"
        expected_latency = sum(l.latency_ms for l in path)
        candidates.append((path, "sequential", via, expected_latency))
        candidates.append((path, "parallel", via, expected_latency / 2))
    if allow_satellite:
        try:
            path = network.compute_shortest_path(task.payload["src"], task.payload["dst"], kind_filter="satellite")
            expected_latency = sum(l.latency_ms for l in path)
            candidates.append((path, "sequential", "satellite", expected_latency))
        except Exception:
            pass

    best: Optional[RoutePlan] = None
    for path, strategy, via, exp_lat in candidates:
        exp_succ = _estimate_success(path, params)
        exp_fid = min(l.fidelity_base for l in path)
        if exp_fid < task.fidelity_threshold:
            exp_fid *= 0.9
        if best is None or (exp_fid >= task.fidelity_threshold and exp_lat < best.expected_latency):
            best = RoutePlan(path, strategy, via, exp_lat, exp_succ, exp_fid)
    if best is None:
        raise RuntimeError("No route available")
    return best


def execute_plan(plan: RoutePlan, task: QuantumTask, rng: np.random.Generator, params: EntanglementParams) -> ExecutionReport:
    if plan.strategy == "sequential":
        res = sequential_swapping(plan.path, params, rng)
    elif plan.strategy == "parallel":
        res = parallel_segment_swapping(plan.path.copy(), params, rng)
    else:
        res = mpses_with_contention(plan.path.copy(), params, rng)
    success = res.get("success", False) and res.get("fidelity", 0.0) >= task.fidelity_threshold
    success = success and res.get("latency_ms", 0.0) <= task.max_latency_ms
    return ExecutionReport(
        success=success,
        attempts=res.get("attempts", 0),
        latency_ms=res.get("latency_ms", 0.0),
        fidelity=res.get("fidelity", 0.0),
        strategy=plan.strategy,
        via=plan.via,
    )
