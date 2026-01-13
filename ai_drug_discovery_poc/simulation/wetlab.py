"""Mock wet-lab service for evaluating candidate molecules."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

import logging
import random

logger = logging.getLogger(__name__)


@dataclass
class WetLabResult:
    """Result from the mock wet-lab service."""

    molecule: str
    activity: float
    toxicity: float


class MockWetLabService:
    """Surrogate wet-lab evaluation using random QSAR-like predictors."""

    def __init__(self, seed: int = 42):
        random.seed(seed)

    def evaluate(self, molecules: Iterable[str]) -> list[WetLabResult]:
        """Evaluate candidate molecules.

        Args:
            molecules: Iterable of SMILES strings.

        Returns:
            List of WetLabResult objects.
        """
        results: list[WetLabResult] = []
        for mol in molecules:
            activity = random.uniform(0.0, 1.0)
            toxicity = random.uniform(0.0, 1.0)
            results.append(WetLabResult(molecule=mol, activity=activity, toxicity=toxicity))
        logger.info("Wet-lab evaluated %s molecules", len(results))
        return results
