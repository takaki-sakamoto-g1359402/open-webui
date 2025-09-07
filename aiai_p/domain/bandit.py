from __future__ import annotations

import math
from typing import Any, Dict, List, Tuple

from ..services import db
from . import causal


def rank_partners(query: str, innovators: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Rank innovators using UCB-1 based on history."""
    weights: List[Tuple[float, Dict[str, Any]]] = []
    q_lower = query.lower()
    total = db.total_history()
    for inv in innovators:
        base = 1.0 if inv.get("domain", "").lower() in q_lower else 0.0
        base += 0.5 if inv["name"].lower() in q_lower else 0.0
        base *= db.get_partner_weight(inv["name"])
        s, f = db.pair_stats(inv["name"])
        n = s + f
        if n == 0:
            ucb = float("inf")
        else:
            avg = (s - f) / n
            ucb = avg + math.sqrt(2 * math.log(total + 1) / n)
        weights.append((base * ucb, inv))
    weights.sort(key=lambda x: x[0], reverse=True)
    return [w[1] for w in weights[:3]]
