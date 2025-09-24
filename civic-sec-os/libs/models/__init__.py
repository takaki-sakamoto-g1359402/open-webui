"""Explainable analytics models."""
from __future__ import annotations

from dataclasses import dataclass
from typing import List, Sequence


def z_score(series: Sequence[float]) -> List[float]:
    mean = sum(series) / len(series)
    variance = sum((x - mean) ** 2 for x in series) / len(series)
    std = variance ** 0.5 or 1.0
    return [(x - mean) / std for x in series]


def detect_anomalies(series: Sequence[float], threshold: float = 3.0) -> List[int]:
    scores = z_score(series)
    return [idx for idx, score in enumerate(scores) if abs(score) >= threshold]


def explain_anomaly(value: float, mean: float, std: float) -> str:
    deviation = value - mean
    direction = "above" if deviation > 0 else "below"
    return f"{abs(deviation):.2f} units {direction} expected mean"


def simple_forecast(series: Sequence[float], alpha: float = 0.5) -> List[float]:
    if not 0 < alpha <= 1:
        raise ValueError("alpha must be between 0 and 1")
    forecasts = [series[0]]
    for value in series[1:]:
        next_value = alpha * value + (1 - alpha) * forecasts[-1]
        forecasts.append(next_value)
    return forecasts


@dataclass
class ForecastResult:
    forecast: List[float]
    mean_absolute_error: float


def evaluate_forecast(series: Sequence[float], alpha: float = 0.5) -> ForecastResult:
    predicted = simple_forecast(series, alpha=alpha)
    errors = [abs(a - b) for a, b in zip(series[1:], predicted[:-1])]
    mae = sum(errors) / len(errors)
    return ForecastResult(forecast=predicted, mean_absolute_error=mae)


__all__ = [
    "detect_anomalies",
    "evaluate_forecast",
    "explain_anomaly",
    "simple_forecast",
    "z_score",
    "ForecastResult",
]
