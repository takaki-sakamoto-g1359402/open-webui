"""Agent orchestrator coordinating multi-agent conversations."""

from __future__ import annotations

import logging
from typing import List

from .agents.policy_agent import PolicyAgent
from .agents.risk_agent import RiskAgent
from .agents.ethics_agent import EthicsAgent
from .agents.sim_agent import SimAgent

logger = logging.getLogger(__name__)


class AgentOrchestrator:
    """Round-robin orchestrator for agents."""

    def __init__(self, policy: PolicyAgent, risk: RiskAgent, ethics: EthicsAgent, sim: SimAgent, cycles: int = 1) -> None:
        self.policy = policy
        self.risk = risk
        self.ethics = ethics
        self.sim = sim
        self.cycles = cycles

    def run(self) -> List[str]:
        """Execute conversation cycles and return ranked actions."""
        proposals: List[str] = []
        for _ in range(self.cycles):
            actions = self.policy.plan()
            self.policy.act(actions)
            risks = self.risk.plan()
            self.risk.act(risks)
            self.sim.act(self.sim.plan())
            for action in actions:
                score = self.ethics.score_action(action)
                proposals.append((action, score))
        ranked = [a for a, _ in sorted(proposals, key=lambda x: x[1], reverse=True)]
        logger.info("Ranked actions: %s", ranked)
        return ranked
