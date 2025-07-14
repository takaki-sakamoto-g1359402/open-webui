"""Causal impact estimation using DoWhy."""

from typing import Dict, Any
import pandas as pd
from dowhy import CausalModel


def estimate_impact(a: Dict[str, Any], b: Dict[str, Any]) -> int:
    """Return an impact score using a simple causal model."""
    data = pd.DataFrame(
        {
            "synergy": [int(b["name"] in a.get("synergy", []))],
            "supply": [int(b["name"] in a.get("supply_chain", []))],
            "conflict": [int(b["name"] in a.get("conflict", []))],
            "diverse": [int(a.get("domain") != b.get("domain"))],
            "impact": [0],
        }
    )
    model = CausalModel(data=data, treatment=["synergy", "supply", "conflict", "diverse"], outcome="impact")
    estimand = model.identify_effect()
    try:
        estimate = model.estimate_effect(estimand, method_name="backdoor.linear_regression")
        value = float(estimate.value)
    except Exception:
        value = 0.5
    return int(max(0, min(100, value * 100)))

