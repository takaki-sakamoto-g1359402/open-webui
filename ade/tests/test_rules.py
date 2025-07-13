"""Tests for rule engine."""

import networkx as nx

from ade import rules


def test_apply_rules() -> None:
    G = nx.MultiDiGraph()
    G.add_node("a", centrality=0.5, risk="high")
    triggered = []

    def cond(g: nx.MultiDiGraph) -> bool:
        return g.nodes["a"].get("centrality", 0) > 0.3 and g.nodes["a"].get("risk") == "high"

    def action(g: nx.MultiDiGraph) -> None:
        triggered.append(True)
        g.nodes["a"]["flag_critical"] = True

    r = rules.Rule(cond, action)
    rules.apply_rules(G, [r])
    assert triggered and G.nodes["a"].get("flag_critical")
