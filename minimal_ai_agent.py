"""Minimal proof-of-concept AI agent.

This module provides a small, extensible agent that demonstrates the loop of
planning, acting, and learning from feedback. It is intentionally simple so
users can modify and extend it.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional


class MinimalAIAgent:
    """A tiny, extensible AI agent that plans, acts, and learns from feedback."""

    def __init__(self, memory_path: str = "minimal_ai_memory.json") -> None:
        self.memory_path = Path(memory_path)
        self.memory: Dict[str, Any] = {
            "history": [],
            "action_feedback": {},
        }
        # Actions are stored in a dictionary so users can easily add new ones.
        self.actions: Dict[str, Callable[[str], str]] = {
            "reflect": self._action_reflect,
            "write_note": self._action_write_note,
            "calculate": self._action_calculate,
        }
        self.load_memory()

    # ------------------------- Planning -------------------------
    def plan(self, goal: str) -> List[str]:
        """Generate a simple plan for a given goal.

        The plan is a list of strings. Each string encodes an action name
        followed by a short description, e.g., "action:reflect - think about...".
        """
        action_order = self._rank_actions()
        steps = []
        for index, action_name in enumerate(action_order[:3], start=1):
            steps.append(
                f"step {index}: action:{action_name} - apply {action_name} to '{goal}'"
            )
        if not steps:
            steps.append(f"step 1: action:reflect - consider '{goal}'")
        return steps

    def _rank_actions(self) -> List[str]:
        """Order actions by past success, preferring actions that worked well."""
        def success_score(action_name: str) -> float:
            stats = self.memory["action_feedback"].get(action_name, {})
            success = stats.get("success", 0)
            failure = stats.get("failure", 0)
            total = success + failure
            if total == 0:
                return 0.5
            return success / total

        return sorted(self.actions.keys(), key=success_score, reverse=True)

    # ------------------------- Acting -------------------------
    def act(self, step: str) -> str:
        """Execute a single step and log the result.

        Steps are expected to contain an "action:<name>" token. If no action is
        found, the agent defaults to "reflect".
        """
        action_name = self._extract_action_name(step) or "reflect"
        action = self.actions.get(action_name, self._action_reflect)
        result = action(step)
        return result

    def _extract_action_name(self, step: str) -> Optional[str]:
        """Extract an action name from a step string."""
        marker = "action:"
        if marker not in step:
            return None
        after_marker = step.split(marker, 1)[1]
        return after_marker.split()[0].strip("- ").strip()

    # ------------------------- Learning -------------------------
    def learn(self, feedback: Dict[str, Any]) -> None:
        """Store feedback and update action success counts."""
        action_name = feedback.get("action")
        if not action_name:
            return

        stats = self.memory["action_feedback"].setdefault(
            action_name, {"success": 0, "failure": 0}
        )
        if feedback.get("success") is True:
            stats["success"] += 1
        elif feedback.get("success") is False:
            stats["failure"] += 1

    # ------------------------- Memory -------------------------
    def save_memory(self) -> None:
        """Persist memory to disk."""
        self.memory_path.write_text(json.dumps(self.memory, indent=2))

    def load_memory(self) -> None:
        """Load memory from disk if available."""
        if not self.memory_path.exists():
            return
        try:
            self.memory = json.loads(self.memory_path.read_text())
        except json.JSONDecodeError:
            # If the memory file is corrupted, start fresh but keep the file.
            self.memory = {"history": [], "action_feedback": {}}

    # ------------------------- Extensible Actions -------------------------
    def register_action(self, name: str, handler: Callable[[str], str]) -> None:
        """Register a new action so users can expand the agent's capabilities."""
        self.actions[name] = handler

    def _action_reflect(self, step: str) -> str:
        """Default action: print a reflection message."""
        message = f"[reflect] Considering step: {step}"
        print(message)
        return message

    def _action_write_note(self, step: str) -> str:
        """Write a small note to a file, demonstrating side effects."""
        note_path = Path("agent_notes.txt")
        note = f"Note from agent: {step}\n"
        note_path.write_text(note_path.read_text() + note if note_path.exists() else note)
        message = f"[write_note] Wrote note to {note_path}"
        print(message)
        return message

    def _action_calculate(self, step: str) -> str:
        """Perform a trivial calculation as a placeholder action."""
        numbers = [1, 2, 3]
        total = sum(numbers)
        message = f"[calculate] Summed {numbers} = {total} for step: {step}"
        print(message)
        return message


def run_cli() -> None:
    """Run a simple command-line interface for the agent."""
    parser = argparse.ArgumentParser(description="Minimal AI Agent")
    parser.add_argument(
        "--memory",
        default="minimal_ai_memory.json",
        help="Path to the JSON memory file.",
    )
    args = parser.parse_args()

    agent = MinimalAIAgent(memory_path=args.memory)

    goal = input("Enter a goal for the agent: ").strip()
    if not goal:
        print("No goal provided. Exiting.")
        return

    plan = agent.plan(goal)
    print("\nGenerated plan:")
    for step in plan:
        print(f"- {step}")

    proceed = input("\nProceed with this plan? (y/n): ").strip().lower()
    if proceed != "y":
        print("Plan aborted.")
        return

    action_log = []
    for step in plan:
        run_step = input(f"\nRun step '{step}'? (y/n): ").strip().lower()
        if run_step != "y":
            action_log.append({"step": step, "skipped": True})
            continue
        result = agent.act(step)
        success_input = input("Was this step successful? (y/n): ").strip().lower()
        success = success_input == "y"
        feedback = {
            "action": agent._extract_action_name(step) or "reflect",
            "success": success,
            "comment": input("Optional feedback comment: ").strip(),
        }
        agent.learn(feedback)
        action_log.append({"step": step, "result": result, "feedback": feedback})

    agent.memory["history"].append(
        {"goal": goal, "plan": plan, "actions": action_log}
    )
    agent.save_memory()
    print("\nSession complete. Memory saved.")


if __name__ == "__main__":
    run_cli()
