"""Agent definitions for multi-agent orchestration."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

import logging

logger = logging.getLogger(__name__)


@dataclass
class AgentContext:
    """Shared context passed between agents."""

    data: dict[str, Any] = field(default_factory=dict)


@dataclass
class BaseAgent:
    """Base class for all agents.

    Each agent has a name, memory buffer, and run method.
    """

    name: str
    memory: list[dict[str, Any]] = field(default_factory=list)

    async def run(self, context: AgentContext) -> AgentContext:
        """Execute the agent's task and update context.

        Args:
            context: Shared agent context.

        Returns:
            Updated agent context.
        """
        logger.debug("%s received context keys: %s", self.name, list(context.data.keys()))
        return context


class LiteratureAgent(BaseAgent):
    """Collects and summarizes relevant literature."""

    async def run(self, context: AgentContext) -> AgentContext:
        self.memory.append({"action": "survey", "summary": "Stub literature summary."})
        context.data["literature_summary"] = "Key targets: EGFR, ALK, KRAS."
        return context


class HypothesisAgent(BaseAgent):
    """Formulates hypotheses based on literature."""

    async def run(self, context: AgentContext) -> AgentContext:
        summary = context.data.get("literature_summary", "")
        hypothesis = f"Hypothesis derived from summary: {summary}"
        self.memory.append({"action": "hypothesis", "text": hypothesis})
        context.data["hypothesis"] = hypothesis
        return context


class GeneratorAgent(BaseAgent):
    """Generates candidate molecules or proteins."""

    def __init__(self, name: str, generator: Any):
        super().__init__(name=name)
        self.generator = generator

    async def run(self, context: AgentContext) -> AgentContext:
        prompt = context.data.get("hypothesis", "")
        candidates = self.generator.generate(prompt, num_candidates=5)
        self.memory.append({"action": "generate", "candidates": candidates})
        context.data["candidates"] = candidates
        return context


class SimulationAgent(BaseAgent):
    """Runs in silico simulations or wet-lab surrogates."""

    def __init__(self, name: str, simulator: Any):
        super().__init__(name=name)
        self.simulator = simulator

    async def run(self, context: AgentContext) -> AgentContext:
        candidates = context.data.get("candidates", [])
        outcomes = self.simulator.evaluate(candidates)
        self.memory.append({"action": "simulate", "outcomes": outcomes})
        context.data["simulation_results"] = outcomes
        return context


class EvaluationAgent(BaseAgent):
    """Evaluates candidates using computed metrics."""

    def __init__(self, name: str, evaluator: Any):
        super().__init__(name=name)
        self.evaluator = evaluator

    async def run(self, context: AgentContext) -> AgentContext:
        candidates = context.data.get("candidates", [])
        results = self.evaluator.evaluate(candidates)
        self.memory.append({"action": "evaluate", "results": results})
        context.data["evaluation_results"] = results
        return context


class LearningAgent(BaseAgent):
    """Updates models or proposes new actions based on feedback."""

    async def run(self, context: AgentContext) -> AgentContext:
        feedback = context.data.get("evaluation_results", [])
        self.memory.append({"action": "learn", "feedback": feedback})
        context.data["next_steps"] = "Refine candidates and rerun docking."
        return context
