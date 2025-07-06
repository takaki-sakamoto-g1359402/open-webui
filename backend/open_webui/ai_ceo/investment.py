"""Investment decision algorithms."""
from dataclasses import dataclass
from typing import Dict


@dataclass
class Investment:
    irr: float
    alignment: float
    risk: float


def evaluate_investment(inv: Investment, weights: Dict[str, float]) -> float:
    """Return weighted investment attractiveness score.

    Parameters
    ----------
    inv: Investment
        Investment metrics.
    weights: Dict[str, float]
        Weights for ``irr``, ``alignment`` and ``risk``.
    """
    irr_w = weights.get("irr", 1.0)
    align_w = weights.get("alignment", 1.0)
    risk_w = weights.get("risk", 1.0)

    score = inv.irr * irr_w + inv.alignment * align_w - inv.risk * risk_w
    return score
