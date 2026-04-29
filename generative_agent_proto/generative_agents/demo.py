"""Deterministic local demo for the generative-agent prototype."""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

from .agent import GenerativeAgent, observe_shared_event
from .environment import SimulationEnvironment
from .models import AgentProfile, MemoryType


DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def reset_demo_data() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    for path in DATA_DIR.glob("demo_*_memories.jsonl"):
        path.unlink()


def print_plan(agent: GenerativeAgent) -> None:
    assert agent.current_plan is not None
    print(f"\nDaily plan for {agent.profile.name}: {agent.current_plan.summary}")
    for item in agent.current_plan.items:
        print(
            f"  - {item.start_time.strftime('%H:%M')} "
            f"{item.location}: {item.task} [{item.status.value}]"
        )


def main() -> None:
    reset_demo_data()
    environment = SimulationEnvironment("Settlement Testbed")

    aya = GenerativeAgent(
        AgentProfile(
            agent_id="demo_aya",
            name="Aya",
            traits=["methodical", "community-minded"],
            goals=["repair shared infrastructure", "coordinate morning work"],
            role_affinities=["maintenance", "planning"],
            boundaries=["deceptive persuasion"],
            priorities={"safety": 0.9, "infrastructure": 0.8},
        ),
        data_dir=DATA_DIR,
    )
    ben = GenerativeAgent(
        AgentProfile(
            agent_id="demo_ben",
            name="Ben",
            traits=["curious", "practical"],
            goals=["support food production", "learn reliable repair routines"],
            role_affinities=["gardening", "apprenticeship"],
            boundaries=["secret data access"],
            priorities={"food": 0.85, "learning": 0.7},
        ),
        data_dir=DATA_DIR,
    )

    print("== Shared event observation ==")
    event_time = datetime(2026, 4, 29, 9, 0, tzinfo=timezone.utc)
    pump_event = environment.emit_event(
        "The community water pump reports low pressure before the morning planting shift.",
        "Workshop",
        created_at=event_time,
        importance_hint=0.78,
        tags=["infrastructure", "maintenance"],
    )
    observations = observe_shared_event([aya, ben], environment, pump_event)
    for memory in observations:
        print(f"Stored {memory.memory_type.value} for {memory.agent_id}: {memory.id}")

    print("\n== Top-k retrieval ==")
    results = aya.retrieve_relevant_memories("water pump maintenance", top_k=2)
    for result in results:
        print(
            f"{result.record.id} score={result.score.final:.3f} "
            f"recency={result.score.recency:.3f} importance={result.score.importance:.3f} "
            f"relevance={result.score.relevance:.3f}"
        )

    print("\n== Grounded reflection ==")
    reflections = aya.reflect()
    for reflection in reflections:
        print(
            f"Reflection {reflection.id} confidence={reflection.confidence:.2f} "
            f"supports={reflection.supporting_memory_ids}"
        )
        print(f"  {reflection.content}")

    print("\n== Daily plan ==")
    aya.plan_day(target_date=event_time.date())
    print_plan(aya)

    print("\n== Plan reconsideration after conflict ==")
    conflict_time = datetime(2026, 4, 29, 9, 30, tzinfo=timezone.utc)
    conflict_event = environment.emit_event(
        "Urgent visitor requests a pump repair demonstration at the same workshop slot.",
        "Workshop",
        created_at=conflict_time,
        importance_hint=0.90,
        tags=["urgent", "schedule_conflict"],
        metadata={"start_time": conflict_time.isoformat(), "duration_minutes": 45},
    )
    conflict_memory = aya.observe(conflict_event)
    decision = aya.reconsider(conflict_event)
    print(f"Decision: {decision.decision.value} because {decision.reason}")
    print_plan(aya)

    print("\n== Failed action, postmortem, and heuristic ==")
    action_result = aya.act(
        "repair pump without checking spare gasket inventory",
        location="Workshop",
        force_success=False,
    )
    learned = aya.learn_from_outcome(
        action_result,
        steps=[
            "accepted urgent request",
            "opened pump casing",
            "discovered missing gasket",
        ],
        supporting_memory_ids=[conflict_memory.id],
    )
    for memory in learned:
        print(f"Learned {memory.memory_type.value}: {memory.id}")
        if memory.memory_type in {MemoryType.POSTMORTEM, MemoryType.HEURISTIC}:
            print(f"  {memory.content}")

    print("\n== Reusable heuristic retrieval ==")
    heuristic_results = aya.learner.retrieve_heuristics_for_task(aya.memory, "pump repair tools", top_k=1)
    for result in heuristic_results:
        print(f"{result.record.id} score={result.score.final:.3f}: {result.record.content}")

    print("\n== Shared environment log ==")
    print(f"Events logged: {len(environment.shared_events())}")
    print(environment.group_reflection_placeholder())


if __name__ == "__main__":
    main()
