from __future__ import annotations

from pathlib import Path

from riai.learner import Learner
from riai.memory import MemoryStore
from riai.planner import Planner


def test_planner_creates_hierarchical_plan(tmp_path: Path) -> None:
    memory = MemoryStore(tmp_path / "memory.sqlite3")
    learner = Learner(memory)
    planner = Planner(seed=1, memory=memory, learner=learner)
    goal = "Organize notes"
    plan = planner.plan(goal)
    assert plan.goal == goal
    assert len(plan.subgoals) >= 2
    for subgoal in plan.subgoals:
        assert subgoal.steps, "Each subgoal should have steps"
    tools = {step.tool for subgoal in plan.subgoals for step in subgoal.steps if step.tool}
    assert "filesystem" in tools
    assert "python_exec" in tools

