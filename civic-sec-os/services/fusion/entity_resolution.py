"""Entity resolution and fusion utilities."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Sequence, Tuple


@dataclass
class Entity:
    id: str
    attributes: Dict[str, str]


class UnionFind:
    def __init__(self) -> None:
        self.parent: Dict[str, str] = {}

    def find(self, item: str) -> str:
        if self.parent.setdefault(item, item) != item:
            self.parent[item] = self.find(self.parent[item])
        return self.parent[item]

    def union(self, a: str, b: str) -> None:
        root_a, root_b = self.find(a), self.find(b)
        if root_a != root_b:
            self.parent[root_b] = root_a


def blocking_key(entity: Entity, keys: Sequence[str]) -> Tuple:
    return tuple(entity.attributes.get(key, "").lower() for key in keys)


def compare_entities(a: Entity, b: Entity, weights: Dict[str, float]) -> float:
    score = 0.0
    total = sum(weights.values()) or 1.0
    for attribute, weight in weights.items():
        if a.attributes.get(attribute, "").lower() == b.attributes.get(attribute, "").lower():
            score += weight
    return score / total


def resolve_entities(
    entities: Sequence[Entity],
    *,
    block_keys: Sequence[str],
    weights: Dict[str, float],
    threshold: float = 0.8,
) -> Dict[str, List[str]]:
    blocks: Dict[Tuple, List[Entity]] = {}
    for entity in entities:
        blocks.setdefault(blocking_key(entity, block_keys), []).append(entity)

    uf = UnionFind()
    for block_entities in blocks.values():
        for i, entity in enumerate(block_entities):
            for candidate in block_entities[i + 1 :]:
                score = compare_entities(entity, candidate, weights)
                if score >= threshold:
                    uf.union(entity.id, candidate.id)

    clusters: Dict[str, List[str]] = {}
    for entity in entities:
        root = uf.find(entity.id)
        clusters.setdefault(root, []).append(entity.id)
    return clusters


def build_graph(clusters: Dict[str, List[str]]) -> Dict[str, List[str]]:
    graph: Dict[str, List[str]] = {}
    for root, members in clusters.items():
        graph[root] = [member for member in members if member != root]
    return graph


__all__ = [
    "Entity",
    "UnionFind",
    "blocking_key",
    "compare_entities",
    "resolve_entities",
    "build_graph",
]
