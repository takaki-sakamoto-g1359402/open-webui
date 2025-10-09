"""Learning component."""
from __future__ import annotations

from typing import Dict, Iterable, List

from .memory import MemoryStore
from .utils.types import Observation, Plan, Skill


class Learner:
    """Stores and retrieves skills and episodic knowledge."""

    def __init__(self, memory: MemoryStore) -> None:
        self.memory = memory

    def store_episode(self, plan: Plan, observations: List[Observation]) -> None:
        self.memory.persist_episode(plan, observations)

    def learn_skill(self, skill: Skill) -> None:
        self.memory.persist_skill(skill)

    def recall_skills(self, hint: str) -> Iterable[Skill]:
        return self.memory.fetch_skills(hint)

