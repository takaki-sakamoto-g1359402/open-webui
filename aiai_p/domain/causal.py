"""Causal impact estimation (heuristic stub)."""

from typing import Any, Dict


def estimate_impact(a: Dict[str, Any], b: Dict[str, Any]) -> int:
    """Return an impact score in the range 0-100."""
    score = 0
    if b["name"] in a.get("synergy", []):
        score += 20
    if b["name"] in a.get("supply_chain", []):
        score += 10
    if b["name"] in a.get("conflict", []):
        score -= 30
    if a.get("domain") != b.get("domain"):
        score += 10
    return max(0, min(100, score))

