"""Causal impact estimation heuristic."""

from typing import Dict


def estimate_impact(a: Dict, b: Dict) -> int:
    """Return an impact score between 0 and 100."""
    score = 0
    if b['name'] in a.get('synergy', []):
        score += 20
    if b['name'] in a.get('supply_chain', []):
        score += 10
    if b['name'] in a.get('conflict', []):
        score -= 30
    if a.get('domain') != b.get('domain'):
        score += 10
    return max(0, min(100, score))
