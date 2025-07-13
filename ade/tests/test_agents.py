"""Tests for agents."""

import networkx as nx

from ade.agents.policy_agent import PolicyAgent
from ade.agents.risk_agent import RiskAgent
from ade.agents.ethics_agent import EthicsAgent
from ade.agents.sim_agent import SimAgent


def test_agents_plan() -> None:
    G = nx.MultiDiGraph()
    p = PolicyAgent("p", G)
    r = RiskAgent("r", G)
    e = EthicsAgent("e", G)
    s = SimAgent("s", G)
    assert p.plan()
    assert r.plan()
    assert e.plan()
    assert s.plan()
