from __future__ import annotations

import logging
import random
import time
from abc import ABC, abstractmethod
from typing import Any, Dict

from .config import AccessConfig

logger = logging.getLogger(__name__)


class QuantumBackend(ABC):
    """Interface for quantum backends, real or simulated."""

    def __init__(self, access_config: AccessConfig | None = None):
        self.access_config = access_config or AccessConfig()

    @abstractmethod
    def run_quantum_function(self, function_name: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        raise NotImplementedError


class SimulatedQuantumBackend(QuantumBackend):
    """Local simulator that mimics Qiskit Functions responses."""

    def run_quantum_function(self, function_name: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        if not self.access_config.is_function_enabled(function_name):
            raise PermissionError(f"Function '{function_name}' not enabled for plan {self.access_config.plan.value}")

        # Deterministic pseudo-random response based on seed payload to keep tests predictable.
        seed = payload.get("seed", 1234)
        random.seed(seed)

        if function_name == "portfolio_optimization":
            assets = payload.get("assets", [])
            weights = self._generate_weights(len(assets))
            risk = round(random.random(), 4)
            return {"weights": weights, "risk": risk, "backend": "simulated"}

        if function_name == "vqe_ground_state_energy":
            iterations = payload.get("iterations", 3)
            energies = [round(random.random(), 4) for _ in range(iterations)]
            return {"energies": energies, "backend": "simulated"}

        return {"message": f"Function {function_name} executed", "backend": "simulated"}

    @staticmethod
    def _generate_weights(length: int) -> Dict[str, float]:
        if length == 0:
            return {}
        raw_weights = [random.random() for _ in range(length)]
        total = sum(raw_weights) or 1.0
        return {str(idx): round(w / total, 3) for idx, w in enumerate(raw_weights)}


class MockIBMQuantumBackend(QuantumBackend):
    """Skeleton backend showing where IBM SDK calls would occur."""

    def run_quantum_function(self, function_name: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        if not self.access_config.is_function_enabled(function_name):
            raise PermissionError(f"Function '{function_name}' not enabled for plan {self.access_config.plan.value}")

        logger.info("[MOCK] Preparing to call IBM Qiskit Runtime for %s", function_name)
        # In a real implementation, this is where you would integrate with qiskit_ibm_runtime:
        # from qiskit_ibm_runtime import QiskitRuntimeService
        # service = QiskitRuntimeService(channel="ibm_quantum", token="...", instance="...")
        # job = service.run(program_id=function_name, inputs=payload)
        # result = job.result()
        # return result

        # Simulate network latency
        time.sleep(0.1)
        return {"mock": True, "function": function_name, "payload": payload, "backend": "mock_ibm"}
