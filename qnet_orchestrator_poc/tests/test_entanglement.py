import numpy as np

from qnet.entanglement import swap_entanglement, EntanglementParams, sequential_swapping, parallel_segment_swapping
from qnet.network import QLink


def test_swap_monotonic():
    f = swap_entanglement(0.9, 0.8, 0.95)
    assert 0 < f < 0.9


def test_parallel_beats_sequential_on_long_path():
    rng = np.random.default_rng(42)
    params = EntanglementParams(max_attempts=5)
    links = [
        QLink("A", "B", "fiber", 100, 0.8, 0.95, 10, 0.05),
        QLink("B", "C", "fiber", 100, 0.8, 0.95, 10, 0.05),
        QLink("C", "D", "fiber", 100, 0.8, 0.95, 10, 0.05),
        QLink("D", "E", "fiber", 100, 0.8, 0.95, 10, 0.05),
    ]
    seq = sequential_swapping(links, params, rng)
    rng = np.random.default_rng(42)
    par = parallel_segment_swapping(links.copy(), params, rng)
    assert par["latency_ms"] <= seq["latency_ms"]
