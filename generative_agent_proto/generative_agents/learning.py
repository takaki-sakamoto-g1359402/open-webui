"""Reflexion-style and ExpeL-style experiential learning."""

from __future__ import annotations

from datetime import timedelta

from .memory import MemoryManager
from .models import (
    ActionResult,
    AgentProfile,
    MemoryRecord,
    MemoryType,
    ReflectionStatus,
    Trajectory,
    make_id,
    serialize_datetime,
)
from .reflection import call_llm, deterministic_importance_score


class ExperientialLearner:
    """Stores trajectories, postmortems, and reusable heuristics."""

    def store_trajectory(
        self,
        memory: MemoryManager,
        result: ActionResult,
        steps: list[str],
        *,
        supporting_memory_ids: list[str] | None = None,
    ) -> MemoryRecord:
        trajectory = Trajectory(
            id=make_id("traj"),
            agent_id=result.agent_id,
            task=result.action,
            steps=steps,
            success=result.success,
            outcome=result.outcome,
            created_at=result.created_at,
            related_memory_ids=supporting_memory_ids or [],
        )
        content = (
            f"Trajectory for '{trajectory.task}': "
            f"{'success' if trajectory.success else 'failure'}; "
            f"steps={trajectory.steps}; outcome={trajectory.outcome}"
        )
        return memory.store(
            MemoryType.PROCEDURAL,
            content,
            importance=0.55 if result.success else 0.75,
            metadata={
                "trajectory": {
                    "id": trajectory.id,
                    "agent_id": trajectory.agent_id,
                    "task": trajectory.task,
                    "steps": trajectory.steps,
                    "success": trajectory.success,
                    "outcome": trajectory.outcome,
                    "created_at": serialize_datetime(trajectory.created_at),
                    "related_memory_ids": trajectory.related_memory_ids,
                    "metadata": trajectory.metadata,
                }
            },
            supporting_memory_ids=[],
            created_at=result.created_at,
        )

    def generate_postmortem(
        self,
        profile: AgentProfile,
        memory: MemoryManager,
        result: ActionResult,
        *,
        supporting_memory_ids: list[str],
    ) -> MemoryRecord | None:
        """Create a grounded natural-language postmortem after failure."""

        if result.success:
            return None
        if not supporting_memory_ids:
            return None
        prompt = f"Write postmortem for {profile.name}: action={result.action}; outcome={result.outcome}"
        stubbed = call_llm(prompt)
        content = (
            f"Postmortem for {profile.name}: the action '{result.action}' failed because "
            f"{result.outcome}. Next attempt should verify prerequisites, timing, and plan conflicts first. {stubbed}"
        )
        return memory.store(
            MemoryType.POSTMORTEM,
            content,
            importance=max(0.65, deterministic_importance_score(content)),
            metadata={"action": result.action, "outcome": result.outcome},
            confidence=0.70,
            supporting_memory_ids=supporting_memory_ids,
            review_at=result.created_at + timedelta(days=1),
            status=ReflectionStatus.ACTIVE,
            created_at=result.created_at,
        )

    def extract_heuristic(
        self,
        profile: AgentProfile,
        memory: MemoryManager,
        result: ActionResult,
        *,
        supporting_memory_ids: list[str],
    ) -> MemoryRecord:
        """Extract a reusable rule of thumb from success or failure."""

        if result.success:
            content = (
                f"Heuristic for {profile.name}: when repeating '{result.action}', preserve the steps that "
                f"led to success and check whether the context still matches."
            )
            importance = 0.55
        else:
            content = (
                f"Heuristic for {profile.name}: before attempting '{result.action}', check required tools, "
                f"schedule conflicts, and recent high-importance observations."
            )
            importance = 0.75
        return memory.store(
            MemoryType.HEURISTIC,
            content,
            importance=importance,
            metadata={"source_action": result.action, "success": result.success},
            supporting_memory_ids=supporting_memory_ids,
            created_at=result.created_at,
        )

    def learn_from_outcome(
        self,
        profile: AgentProfile,
        memory: MemoryManager,
        result: ActionResult,
        steps: list[str],
        *,
        supporting_memory_ids: list[str] | None = None,
    ) -> list[MemoryRecord]:
        """Store trajectory, optional postmortem, and reusable heuristic."""

        supporting_memory_ids = supporting_memory_ids or []
        created: list[MemoryRecord] = []
        trajectory_memory = self.store_trajectory(memory, result, steps, supporting_memory_ids=supporting_memory_ids)
        created.append(trajectory_memory)
        grounded_support = supporting_memory_ids or [trajectory_memory.id]
        postmortem = self.generate_postmortem(profile, memory, result, supporting_memory_ids=grounded_support)
        if postmortem is not None:
            created.append(postmortem)
            grounded_support = [trajectory_memory.id, postmortem.id]
        heuristic = self.extract_heuristic(profile, memory, result, supporting_memory_ids=grounded_support)
        created.append(heuristic)
        return created

    def retrieve_heuristics_for_task(self, memory: MemoryManager, task: str, *, top_k: int = 3):
        return memory.retrieve(task, top_k=top_k, memory_types=[MemoryType.HEURISTIC])
