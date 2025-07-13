"""Base class for agents."""

from __future__ import annotations

import logging
from typing import Any

import networkx as nx

logger = logging.getLogger(__name__)


class AgentBase:
    """Abstract base class for all agents."""

    def __init__(self, name: str, graph: nx.MultiDiGraph) -> None:
        self.name = name
        self.graph = graph

    def plan(self) -> Any:
        """Plan the next action."""
        raise NotImplementedError

    def act(self, plan: Any) -> Any:
        """Execute the planned action."""
        raise NotImplementedError

    def reflect(self, result: Any) -> None:
        """Reflect on the outcome of the action."""
        logger.info("%s reflecting on result: %s", self.name, result)
