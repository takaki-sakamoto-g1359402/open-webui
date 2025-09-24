"""Simple differential privacy helpers."""
from __future__ import annotations

import math
import random
from typing import Sequence


def laplace_noise(value: float, *, sensitivity: float, epsilon: float) -> float:
    if epsilon <= 0 or sensitivity <= 0:
        raise ValueError("epsilon and sensitivity must be positive")
    scale = sensitivity / epsilon
    u = random.random() - 0.5
    return value - scale * math.copysign(1.0, u) * math.log(1 - 2 * abs(u))


def gaussian_noise(
    value: float, *, sensitivity: float, epsilon: float, delta: float
) -> float:
    if epsilon <= 0 or sensitivity <= 0 or not 0 < delta < 1:
        raise ValueError("invalid differential privacy parameters")
    sigma = math.sqrt(2 * math.log(1.25 / delta)) * sensitivity / epsilon
    return random.gauss(value, sigma)


def bounded_average(values: Sequence[float], *, lower: float, upper: float) -> float:
    if lower >= upper:
        raise ValueError("lower bound must be less than upper")
    clipped = [min(max(v, lower), upper) for v in values]
    return sum(clipped) / len(clipped)


def private_mean(
    values: Sequence[float],
    *,
    lower: float,
    upper: float,
    epsilon: float,
    mechanism: str = "laplace",
    delta: float = 1e-5,
) -> float:
    base = bounded_average(values, lower=lower, upper=upper)
    sensitivity = (upper - lower) / len(values)
    if mechanism == "laplace":
        return laplace_noise(base, sensitivity=sensitivity, epsilon=epsilon)
    if mechanism == "gaussian":
        return gaussian_noise(
            base, sensitivity=sensitivity, epsilon=epsilon, delta=delta
        )
    raise ValueError("unknown mechanism")


__all__ = [
    "laplace_noise",
    "gaussian_noise",
    "bounded_average",
    "private_mean",
]
