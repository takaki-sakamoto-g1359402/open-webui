"""Tests for orchestrator."""

from ade import data_loader, graph_builder
from ade.agents.policy_agent import PolicyAgent
from ade.agents.risk_agent import RiskAgent
from ade.agents.ethics_agent import EthicsAgent
from ade.agents.sim_agent import SimAgent
from ade.orchestrator import AgentOrchestrator


def test_orchestrator_run(tmp_path) -> None:
    contacts, interactions, events = data_loader.load_local_data(tmp_path)
    G = graph_builder.build_graph(contacts, interactions, events)
    orch = AgentOrchestrator(
        PolicyAgent("policy", G),
        RiskAgent("risk", G),
        EthicsAgent("ethics", G),
        SimAgent("sim", G),
    )
    ranked = orch.run()
    assert isinstance(ranked, list)
    assert ranked
