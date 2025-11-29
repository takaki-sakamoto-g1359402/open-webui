"""Quantum network model with fiber/satellite links."""

from __future__ import annotations

from dataclasses import dataclass
from typing import List, Optional, Tuple
import math
import networkx as nx


@dataclass
class QNode:
    node_id: str
    qpu_type: str
    memory_qubits: int
    location_xy: Tuple[float, float]


@dataclass
class QLink:
    u: str
    v: str
    kind: str  # fiber or satellite
    distance_km: float
    p_gen: float  # base entanglement generation probability per attempt
    fidelity_base: float
    latency_ms: float
    transduction_cost: float  # additional fidelity penalty for microwave<->telecom


class QuantumNetwork:
    def __init__(self) -> None:
        self.graph = nx.Graph()

    def add_node(self, node: QNode) -> None:
        self.graph.add_node(node.node_id, data=node)

    def add_link(self, link: QLink) -> None:
        self.graph.add_edge(link.u, link.v, data=link)

    def compute_shortest_path(
        self, source: str, target: str, kind_filter: Optional[str] = None
    ) -> List[QLink]:
        def edge_weight(u: str, v: str, data: dict) -> float:
            link: QLink = data["data"]
            if kind_filter and link.kind != kind_filter:
                return math.inf
            return link.latency_ms

        path = nx.shortest_path(
            self.graph, source=source, target=target, weight=edge_weight
        )
        links: List[QLink] = []
        for i in range(len(path) - 1):
            u, v = path[i], path[i + 1]
            link: QLink = self.graph[u][v]["data"]
            if kind_filter and link.kind != kind_filter:
                raise nx.NetworkXNoPath("Filtered path not possible")
            links.append(link)
        return links

    def visualize_text(self) -> str:
        lines = ["QuantumNetwork:"]
        for u, v, data in self.graph.edges(data=True):
            link: QLink = data["data"]
            lines.append(
                f"{u} -- {v} ({link.kind}, {link.distance_km}km, p={link.p_gen:.2f}, F={link.fidelity_base:.2f})"
            )
        return "\n".join(lines)

    def nodes(self) -> List[str]:
        return list(self.graph.nodes)

    def links_for_path(self, path: List[str]) -> List[QLink]:
        links: List[QLink] = []
        for i in range(len(path) - 1):
            link: QLink = self.graph[path[i]][path[i + 1]]["data"]
            links.append(link)
        return links
