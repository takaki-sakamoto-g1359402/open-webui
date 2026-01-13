"""Agent manager to orchestrate multi-agent workflows."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

import asyncio
import logging
import time

from .base import AgentContext, BaseAgent

logger = logging.getLogger(__name__)


@dataclass
class AgentMetrics:
    """Metrics for tracking agent performance."""

    task_completion_rate: float
    latency_by_agent: dict[str, float]


class AgentManager:
    """Coordinates agent execution using an async Plan–Act–Reflect–Learn loop."""

    def __init__(self, agents: Iterable[BaseAgent]):
        self.agents = list(agents)
        self.queue: asyncio.Queue[BaseAgent] = asyncio.Queue()

    async def plan(self) -> None:
        """Plan agent execution order."""
        for agent in self.agents:
            await self.queue.put(agent)
        logger.info("Planned %s agents", len(self.agents))

    async def act(self, context: AgentContext) -> AgentContext:
        """Execute agent tasks in sequence."""
        while not self.queue.empty():
            agent = await self.queue.get()
            context = await agent.run(context)
        return context

    async def reflect(self, context: AgentContext) -> AgentMetrics:
        """Compute metrics on the agent loop."""
        latency = {agent.name: 0.0 for agent in self.agents}
        completion_rate = 1.0 if context.data else 0.0
        return AgentMetrics(task_completion_rate=completion_rate, latency_by_agent=latency)

    async def learn(self, context: AgentContext) -> None:
        """Placeholder for updating agent strategies."""
        _ = context
        logger.info("Learning step completed")

    async def run(self, initial_context: AgentContext) -> tuple[AgentContext, AgentMetrics]:
        """Run the full Plan–Act–Reflect–Learn loop."""
        await self.plan()
        start = time.perf_counter()
        context = await self.act(initial_context)
        metrics = await self.reflect(context)
        metrics.latency_by_agent = {
            agent.name: time.perf_counter() - start for agent in self.agents
        }
        await self.learn(context)
        return context, metrics
