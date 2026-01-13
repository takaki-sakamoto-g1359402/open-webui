"""Evaluation metrics for drug discovery candidates."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

import logging

import numpy as np

try:
    from rdkit import Chem
    from rdkit.Chem import Descriptors
except ImportError:  # pragma: no cover
    Chem = None
    Descriptors = None

logger = logging.getLogger(__name__)


@dataclass
class CandidateMetrics:
    """Container for molecule evaluation metrics."""

    molecule: str
    binding_affinity: float
    similarity: float
    qed: float
    synthetic_accessibility: float


def compute_binding_affinity(smiles: str) -> float:
    """Placeholder binding affinity computation."""
    return -7.0


def compute_similarity(smiles: str, reference: str = "CCO") -> float:
    """Placeholder similarity score."""
    return 0.5


def compute_qed(smiles: str) -> float:
    """Compute QED drug-likeness if RDKit is available."""
    if Chem is None or Descriptors is None:
        return 0.0
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        return 0.0
    return float(Descriptors.qed(mol))


def compute_synthetic_accessibility(smiles: str) -> float:
    """Stub synthetic accessibility metric."""
    return 0.4


def evaluate_candidates(smiles: Iterable[str]) -> list[CandidateMetrics]:
    """Evaluate a list of candidate molecules."""
    metrics: list[CandidateMetrics] = []
    for smi in smiles:
        metrics.append(
            CandidateMetrics(
                molecule=smi,
                binding_affinity=compute_binding_affinity(smi),
                similarity=compute_similarity(smi),
                qed=compute_qed(smi),
                synthetic_accessibility=compute_synthetic_accessibility(smi),
            )
        )
    logger.info("Evaluated %s candidates", len(metrics))
    return metrics


@dataclass
class AgenticMetrics:
    """Agentic workflow metrics."""

    task_completion_rate: float
    latency_by_agent: dict[str, float]
    user_satisfaction: float


def aggregate_agent_metrics(
    task_completion_rate: float, latency_by_agent: dict[str, float]
) -> AgenticMetrics:
    """Aggregate agent metrics with placeholder user satisfaction."""
    user_satisfaction = 0.0
    return AgenticMetrics(
        task_completion_rate=task_completion_rate,
        latency_by_agent=latency_by_agent,
        user_satisfaction=user_satisfaction,
    )


def metrics_to_dataframe(metrics: list[CandidateMetrics]) -> "np.ndarray":
    """Convert metrics to a numpy structured array for plotting."""
    dtype = [
        ("molecule", "U128"),
        ("binding_affinity", float),
        ("similarity", float),
        ("qed", float),
        ("synthetic_accessibility", float),
    ]
    return np.array(
        [
            (
                metric.molecule,
                metric.binding_affinity,
                metric.similarity,
                metric.qed,
                metric.synthetic_accessibility,
            )
            for metric in metrics
        ],
        dtype=dtype,
    )
