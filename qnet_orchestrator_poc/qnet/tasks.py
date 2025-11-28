"""Task definitions."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass
class QuantumTask:
    task_id: str
    kind: str
    required_ebits: int
    fidelity_threshold: float
    max_latency_ms: float
    payload: Any | None = None


def remote_cz_gate(task_id: str = "task_cz") -> QuantumTask:
    return QuantumTask(task_id, "remote_cz_gate", required_ebits=1, fidelity_threshold=0.9, max_latency_ms=500)


def distributed_grover_small(task_id: str = "task_grover") -> QuantumTask:
    return QuantumTask(task_id, "distributed_grover", required_ebits=2, fidelity_threshold=0.85, max_latency_ms=800)


def generic_dqc_job(task_id: str, ebits: int, fidelity: float, latency_ms: float) -> QuantumTask:
    return QuantumTask(task_id, "generic_dqc", required_ebits=ebits, fidelity_threshold=fidelity, max_latency_ms=latency_ms)
