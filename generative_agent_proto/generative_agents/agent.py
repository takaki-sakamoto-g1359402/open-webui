"""Agent orchestration over observation, memory, reflection, planning, and learning."""

from __future__ import annotations

from datetime import date
from pathlib import Path

from .environment import SimulationEnvironment
from .learning import ExperientialLearner
from .memory import MemoryManager
from .models import (
    ActionResult,
    AgentProfile,
    DailyPlan,
    EnvironmentEvent,
    MemoryRecord,
    MemoryType,
    utc_now,
)
from .planning import ReconsiderationResult, generate_daily_plan, reconsider_plan, replan_for_event
from .reflection import ReflectionEngine, deterministic_importance_score


class GenerativeAgent:
    """Minimal cognitive-agent scaffold.

    The public methods intentionally mirror explicit cognitive steps:
    observe, store memory, retrieve, reflect, plan, act, reconsider, and learn.
    """

    def __init__(
        self,
        profile: AgentProfile,
        *,
        data_dir: str | Path = "data",
        reflection_engine: ReflectionEngine | None = None,
        learner: ExperientialLearner | None = None,
    ) -> None:
        self.profile = profile
        self.memory = MemoryManager(profile.agent_id, data_dir=data_dir)
        self.reflection_engine = reflection_engine or ReflectionEngine()
        self.learner = learner or ExperientialLearner()
        self.current_plan: DailyPlan | None = None

    def observe(self, event: EnvironmentEvent) -> MemoryRecord:
        """Observe an environment event and store it as memory."""

        scored_importance = max(event.importance_hint, deterministic_importance_score(event.description))
        content = f"Observed at {event.location}: {event.description}"
        return self.memory.store(
            MemoryType.OBSERVATION,
            content,
            importance=scored_importance,
            metadata={"event_id": event.id, "location": event.location, "tags": event.tags},
            created_at=event.created_at,
        )

    def retrieve_relevant_memories(self, query: str, *, top_k: int = 3):
        """Retrieve top-k relevant memories for a query."""

        return self.memory.retrieve(query, top_k=top_k)

    def reflect(self) -> list[MemoryRecord]:
        """Run grounded reflection if a trigger is reached."""

        return self.reflection_engine.reflect(self.profile, self.memory)

    def plan_day(self, *, target_date: date | None = None) -> DailyPlan:
        """Create and store a daily plan."""

        context_results = self.memory.retrieve(
            " ".join(self.profile.goals),
            top_k=3,
            memory_types=[MemoryType.OBSERVATION, MemoryType.REFLECTION, MemoryType.HEURISTIC],
        )
        context = [result.record for result in context_results]
        plan = generate_daily_plan(self.profile, target_date=target_date, context_memories=context)
        self.current_plan = plan
        self.memory.store(
            MemoryType.PLAN,
            plan.summary,
            importance=0.45,
            metadata={"plan": plan.to_dict()},
            supporting_memory_ids=[record.id for record in context],
        )
        return plan

    def reconsider(self, event: EnvironmentEvent) -> ReconsiderationResult:
        """Evaluate and possibly modify the current plan."""

        if self.current_plan is None:
            self.plan_day(target_date=event.created_at.date())
        assert self.current_plan is not None
        recent = self.memory.long_term.recent(limit=5)
        result = reconsider_plan(self.profile, self.current_plan, event, recent_memories=recent)
        updated = replan_for_event(self.current_plan, event, result)
        self.current_plan = updated
        self.memory.store(
            MemoryType.PLAN,
            f"Reconsideration result: {result.decision.value}; {result.reason}",
            importance=0.60 if result.decision.value != "continue_current_plan" else 0.35,
            metadata={"event_id": event.id, "decision": result.decision.value, "plan": updated.to_dict()},
            supporting_memory_ids=[memory.id for memory in recent[-3:]],
        )
        return result

    def act(
        self,
        action: str,
        *,
        location: str,
        related_plan_item_id: str | None = None,
        force_success: bool | None = None,
    ) -> ActionResult:
        """Perform a local simulated action.

        v0 has no autonomous external actions. This returns a deterministic
        local result suitable for testing Reflexion/ExpeL-style learning.
        """

        if force_success is None:
            lowered = action.lower()
            success = "without" not in lowered and "fail" not in lowered
        else:
            success = force_success
        outcome = "completed as intended" if success else "missing prerequisite check caused the attempt to fail"
        return ActionResult(
            agent_id=self.profile.agent_id,
            action=action,
            success=success,
            outcome=outcome,
            location=location,
            created_at=utc_now(),
            related_plan_item_id=related_plan_item_id,
        )

    def learn_from_outcome(
        self,
        result: ActionResult,
        steps: list[str],
        *,
        supporting_memory_ids: list[str] | None = None,
    ) -> list[MemoryRecord]:
        return self.learner.learn_from_outcome(
            self.profile,
            self.memory,
            result,
            steps,
            supporting_memory_ids=supporting_memory_ids,
        )


def observe_shared_event(agents: list[GenerativeAgent], environment: SimulationEnvironment, event: EnvironmentEvent) -> list[MemoryRecord]:
    """Have multiple agents observe the same shared event."""

    if event not in environment.shared_events():
        environment.event_log.append(event)
    return [agent.observe(event) for agent in agents]
