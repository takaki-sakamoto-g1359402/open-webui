from __future__ import annotations

import array
import random

from deap import base, tools  # type: ignore


class EvolutionEngine:
    """Simple byte level mutation engine using DEAP."""

    def __init__(self, mutation_rate: float = 0.1):
        self.mutation_rate = mutation_rate
        self.toolbox = base.Toolbox()

    def mutate(self, network_bytes: bytes) -> bytes:
        """Return a mutated copy of provided bytes."""
        arr = array.array("B", network_bytes)
        for i, val in enumerate(arr):
            if random.random() < self.mutation_rate:
                arr[i] = (val + random.randint(0, 255)) % 256
        return bytes(arr)
