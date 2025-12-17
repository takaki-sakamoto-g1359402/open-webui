"""Optional quantum sandbox to perturb scoring."""
from __future__ import annotations

import os
import random
from typing import Callable


class QuantumSandbox:
    def __init__(self, enabled: bool | None = None):
        env_toggle = os.getenv("RVLOOP_QUANTUM", "0") == "1"
        self.enabled = env_toggle if enabled is None else enabled
        self._epsilon_fn: Callable[[], float] = self._load_backend()

    def _load_backend(self) -> Callable[[], float]:
        if not self.enabled:
            return lambda: 0.0
        try:
            from qiskit import QuantumCircuit, transpile
            from qiskit_aer import Aer

            def epsilon() -> float:
                qc = QuantumCircuit(1, 1)
                qc.h(0)
                qc.measure(0, 0)
                backend = Aer.get_backend("aer_simulator")
                compiled = transpile(qc, backend)
                result = backend.run(compiled, shots=1).result()
                counts = result.get_counts()
                bit = int(max(counts, key=counts.get))
                return (bit * 0.001)

            return epsilon
        except Exception:
            # Deterministic fallback to keep build stable
            rng = random.Random(42)
            return lambda: rng.random() * 0.0001

    def epsilon(self) -> float:
        return self._epsilon_fn()
