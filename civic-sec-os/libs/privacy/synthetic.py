"""Synthetic data generator with risk evaluators."""
from __future__ import annotations

import random
from dataclasses import dataclass
from typing import Dict, List, Sequence, Tuple


def empirical_cdf(sample: Sequence[float], value: float) -> float:
    less_equal = sum(1 for v in sample if v <= value)
    return less_equal / len(sample)


def kolmogorov_smirnov_statistic(
    real: Sequence[float], synthetic: Sequence[float]
) -> float:
    support = sorted(set(real) | set(synthetic))
    return max(abs(empirical_cdf(real, x) - empirical_cdf(synthetic, x)) for x in support)


def privacy_risk(real: Sequence[Tuple], synthetic: Sequence[Tuple]) -> float:
    real_counts: Dict[Tuple, int] = {}
    for row in real:
        real_counts[row] = real_counts.get(row, 0) + 1
    risk = 0.0
    for row in synthetic:
        if row in real_counts:
            risk = max(risk, real_counts[row] / len(real))
    return risk


@dataclass
class SyntheticDataGenerator:
    seed: int = 17

    def __post_init__(self) -> None:
        random.seed(self.seed)

    def sample_row(self, record: Dict[str, float]) -> Dict[str, float]:
        noisy = {}
        for key, value in record.items():
            jitter = random.gauss(0, max(abs(value) * 0.05, 0.01))
            noisy[key] = value + jitter
        return noisy

    def generate(self, dataset: Sequence[Dict[str, float]], n: int) -> List[Dict[str, float]]:
        if not dataset:
            return []
        base_rows = [random.choice(dataset) for _ in range(n)]
        return [self.sample_row(row) for row in base_rows]


__all__ = [
    "SyntheticDataGenerator",
    "kolmogorov_smirnov_statistic",
    "privacy_risk",
]
