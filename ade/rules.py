"""Simple rule engine for neuro-symbolic logic."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Callable, List

import networkx as nx

logger = logging.getLogger(__name__)


@dataclass
class Rule:
    """Represents an IF-THEN rule."""

    condition: Callable[[nx.MultiDiGraph], bool]
    action: Callable[[nx.MultiDiGraph], None]


def apply_rules(graph: nx.MultiDiGraph, rules: List[Rule]) -> None:
    """Apply rules to the graph."""
    for rule in rules:
        if rule.condition(graph):
            logger.info("Rule triggered: %s", rule)
            rule.action(graph)
