"""Evaluation service for candidate molecules."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

from .metrics import CandidateMetrics, evaluate_candidates


@dataclass
class CandidateEvaluator:
    """Callable wrapper to evaluate candidate molecules."""

    def evaluate(self, candidates: Iterable[str]) -> list[CandidateMetrics]:
        """Evaluate candidate molecules and return metrics."""
        return evaluate_candidates(list(candidates))
