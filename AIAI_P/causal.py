from typing import Dict
import networkx as nx


def estimate_impact(a: Dict, b: Dict, graph: nx.MultiDiGraph) -> int:
    """Return a simple causal impact score between 0 and 100."""
    score = 0
    if graph.has_edge(a["name"], b["name"]):
        for _, _, d in graph.edges(a["name"], b["name"], data=True):
            if d.get("type") == "synergy":
                score += 20
            elif d.get("type") == "supply-chain":
                score += 10
            elif d.get("type") == "conflict":
                score -= 30
    if set(a.get("domain", [])) != set(b.get("domain", [])):
        score += 10
    return max(0, min(100, score))
