"""Reflection and local deterministic LLM stubs."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta

from .memory import MemoryManager
from .models import AgentProfile, MemoryRecord, MemoryType, ReflectionStatus, utc_now


def call_llm(prompt: str) -> str:
    """Stubbed LLM call.

    v0 never calls external APIs. Replace this function with a configured
    model adapter later, keeping privacy, consent, and audit requirements in
    the caller.
    """

    compact = " ".join(prompt.split())[:96]
    return f"[local-llm-stub] {compact}"


def deterministic_importance_score(text: str) -> float:
    """Deterministic fallback importance scorer for local demos."""

    tokens = set(text.lower().replace("-", " ").split())
    high_value_terms = {
        "urgent",
        "failed",
        "failure",
        "conflict",
        "blocked",
        "risk",
        "safety",
        "mistake",
        "deadline",
        "emergency",
        "repair",
        "low",
        "pressure",
    }
    score = 0.20 + min(0.25, len(tokens) / 80.0)
    score += min(0.45, 0.09 * len(tokens.intersection(high_value_terms)))
    return max(0.0, min(1.0, score))


@dataclass(frozen=True)
class ReflectionTrigger:
    """Why reflection did or did not run."""

    should_reflect: bool
    reason: str


class ReflectionEngine:
    """Generates grounded reflective memories from recent evidence."""

    def __init__(
        self,
        *,
        importance_threshold: float = 0.70,
        observation_count_threshold: int = 3,
        elapsed_minutes_threshold: int = 180,
        max_supporting_memories: int = 5,
    ) -> None:
        self.importance_threshold = importance_threshold
        self.observation_count_threshold = observation_count_threshold
        self.elapsed_minutes_threshold = elapsed_minutes_threshold
        self.max_supporting_memories = max_supporting_memories

    def should_reflect(self, memories: list[MemoryRecord], *, now: datetime | None = None) -> ReflectionTrigger:
        now = now or utc_now()
        reflections = [memory for memory in memories if memory.memory_type == MemoryType.REFLECTION]
        last_reflection_at = max((memory.created_at for memory in reflections), default=None)
        candidates = [
            memory
            for memory in memories
            if memory.memory_type in {MemoryType.OBSERVATION, MemoryType.POSTMORTEM, MemoryType.HEURISTIC}
            and (last_reflection_at is None or memory.created_at > last_reflection_at)
        ]
        accumulated_importance = sum(memory.importance for memory in candidates)
        if accumulated_importance >= self.importance_threshold:
            return ReflectionTrigger(True, f"accumulated importance {accumulated_importance:.2f}")
        observations = [memory for memory in candidates if memory.memory_type == MemoryType.OBSERVATION]
        if len(observations) >= self.observation_count_threshold:
            return ReflectionTrigger(True, f"{len(observations)} new observations")
        if last_reflection_at and now - last_reflection_at >= timedelta(minutes=self.elapsed_minutes_threshold):
            return ReflectionTrigger(True, "elapsed reflection interval")
        return ReflectionTrigger(False, "thresholds not reached")

    def generate_questions(self, profile: AgentProfile, supporting: list[MemoryRecord]) -> list[str]:
        prompt = (
            f"Generate reflective questions for {profile.name}. "
            f"Recent memories: {[memory.content for memory in supporting]}"
        )
        stubbed = call_llm(prompt)
        if any("conflict" in memory.content.lower() for memory in supporting):
            return [f"What plan pressure should {profile.name} account for next? ({stubbed})"]
        if profile.goals:
            return [f"What do recent events imply for the goal '{profile.goals[0]}'? ({stubbed})"]
        return [f"What stable pattern is visible in the recent evidence? ({stubbed})"]

    def generate_insight(
        self,
        profile: AgentProfile,
        question: str,
        supporting: list[MemoryRecord],
    ) -> tuple[str, float]:
        top_memory = max(supporting, key=lambda memory: memory.importance)
        average_importance = sum(memory.importance for memory in supporting) / max(1, len(supporting))
        confidence = max(0.20, min(0.85, 0.40 + 0.10 * len(supporting) + 0.25 * average_importance))
        content = (
            f"Insight for {profile.name}: recent evidence suggests '{top_memory.content}' "
            f"should influence near-term planning. Question considered: {question.split('(')[0].strip()}"
        )
        return content, confidence

    def reflect(
        self,
        profile: AgentProfile,
        memory: MemoryManager,
        *,
        now: datetime | None = None,
    ) -> list[MemoryRecord]:
        """Generate and store grounded reflection memories."""

        now = now or utc_now()
        all_memories = memory.long_term.list_all()
        trigger = self.should_reflect(all_memories, now=now)
        if not trigger.should_reflect:
            return []

        supporting = [
            record
            for record in memory.long_term.recent(limit=self.max_supporting_memories)
            if record.memory_type != MemoryType.REFLECTION
        ]
        if not supporting:
            return []

        supporting_ids = [record.id for record in supporting]
        reflections: list[MemoryRecord] = []
        for question in self.generate_questions(profile, supporting):
            insight, confidence = self.generate_insight(profile, question, supporting)
            reflection = memory.store(
                MemoryType.REFLECTION,
                insight,
                importance=max(0.55, min(1.0, confidence)),
                metadata={"question": question, "trigger": trigger.reason},
                confidence=confidence,
                supporting_memory_ids=supporting_ids,
                review_at=now + timedelta(days=1),
                status=ReflectionStatus.ACTIVE,
                created_at=now,
            )
            reflections.append(reflection)
        return reflections
