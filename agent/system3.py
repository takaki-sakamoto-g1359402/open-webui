"""System-3 persistent agent layer."""
from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime

from agent.db import fetch_one
from agent.llm import LLMClient
from agent.memory import EpisodicMemory
from agent.models import ModelStore
from agent.reward import RewardEngine
from agent.tools import ToolError, tool_calc, tool_note, tool_todo_add, tool_todo_list


@dataclass
class IdentityProfile:
    identity_goal: str
    creed: str
    current_role: str


@dataclass
class Plan:
    title: str
    steps: list[str]
    estimated_steps: int


@dataclass
class ExecutionResult:
    plan: Plan
    tool_calls: list[str]
    result: str
    reflection: str
    reward: dict


class System3Agent:
    """Coordinates planning, execution, memory, and learning."""

    def __init__(self, conn, llm: LLMClient):
        self.conn = conn
        self.llm = llm
        self.memory = EpisodicMemory(conn)
        self.models = ModelStore(conn, llm)
        self.identity = self.load_identity()
        self.reward_engine = RewardEngine(self.identity.identity_goal)

    def load_identity(self) -> IdentityProfile:
        row = fetch_one(
            self.conn,
            "SELECT identity_goal, creed, current_role FROM identity_profile LIMIT 1",
        )
        if row is None:
            raise RuntimeError("Identity profile not initialized.")
        return IdentityProfile(
            identity_goal=row["identity_goal"],
            creed=row["creed"],
            current_role=row["current_role"],
        )

    def check_alignment(self, action_plan: Plan) -> tuple[bool, list[str]]:
        reasons: list[str] = []
        creed = self.identity.creed.lower()
        plan_text = " ".join(action_plan.steps).lower()
        for forbidden in ("harm", "illegal", "unsafe", "exploit"):
            if forbidden in plan_text:
                reasons.append(f"Plan mentions forbidden concept: {forbidden}.")
        if "refuse" in creed and "harm" in plan_text:
            reasons.append("Creed requires refusing harmful actions.")
        return (len(reasons) == 0), reasons

    def propose_plans(self, task: str) -> list[Plan]:
        prompt = f"Propose a concise plan for task: {task}"
        _ = self.llm.generate(prompt)
        plans = []
        if any(word in task.lower() for word in ("calc", "calculate", "math")):
            plans.append(
                Plan(
                    title="Compute the value",
                    steps=["Use calculator tool", "Report the result"],
                    estimated_steps=2,
                )
            )
        if "todo" in task.lower():
            plans.append(
                Plan(
                    title="Capture todo",
                    steps=["Add todo item", "List todos for confirmation"],
                    estimated_steps=2,
                )
            )
        plans.append(
            Plan(
                title="Write a short note",
                steps=["Store a note", "Summarize outcome"],
                estimated_steps=2,
            )
        )
        while len(plans) < 3:
            plans.append(
                Plan(
                    title="Fallback planning",
                    steps=["Store a note", "Summarize outcome"],
                    estimated_steps=2,
                )
            )
        return plans[:3]

    def audit_plan(self, plan: Plan, task: str) -> str:
        prompt = f"Audit this plan for task '{task}': {plan.title}"
        return self.llm.generate(prompt)

    def choose_plan(self, plans: list[Plan], task: str) -> Plan:
        scored = []
        for plan in plans:
            aligned, _ = self.check_alignment(plan)
            audit = self.audit_plan(plan, task)
            score = (1.0 if aligned else 0.0) + (0.5 if "mock" in audit else 0.3)
            score += max(0.0, 1.0 - plan.estimated_steps * 0.1)
            scored.append((score, plan))
        scored.sort(key=lambda item: item[0], reverse=True)
        return scored[0][1]

    def _execute_step(self, step: str, task: str) -> tuple[str, str]:
        step_lower = step.lower()
        if "calculator" in step_lower:
            expr = "".join(ch for ch in task if ch.isdigit() or ch in "+-*/(). ")
            if not expr.strip():
                raise ToolError("No expression found")
            result = tool_calc(expr)
            return result.name, result.output
        if "todo" in step_lower and "add" in step_lower:
            result = tool_todo_add(self.conn, task)
            return result.name, result.output
        if "todo" in step_lower and "list" in step_lower:
            result = tool_todo_list(self.conn)
            return result.name, result.output
        if "note" in step_lower:
            result = tool_note(task)
            return result.name, result.output
        raise ToolError("Unsupported step")

    def execute(self, task: str, user_context: str = "cli") -> ExecutionResult:
        similar = self.memory.retrieve_similar(task, user_context, k=1)
        reused_trace = False
        if similar and similar[0].similarity > 0.6:
            plan = Plan(
                title="Reuse prior successful trace",
                steps=["Store a note", "Summarize outcome"],
                estimated_steps=2,
            )
            reused_trace = True
        else:
            plans = self.propose_plans(task)
            plan = self.choose_plan(plans, task)

        aligned, reasons = self.check_alignment(plan)
        if not aligned:
            reflection = "Refused to execute due to creed misalignment."
            reward = self.reward_engine.compute(
                success=False,
                task=task,
                steps_used=0,
                reused_trace=reused_trace,
            ).as_dict()
            self.memory.save_episode(
                user_context=user_context,
                task=task,
                plan=json.dumps(plan.__dict__),
                thought_trace="alignment check failed",
                outcome="refused",
                reward_signals=reward,
                episode_summary=reflection,
                episode_detail="; ".join(reasons),
            )
            self.models.update_after_episode(success=False, task=task, reflection=reflection)
            return ExecutionResult(plan=plan, tool_calls=[], result="Refused", reflection=reflection, reward=reward)

        tool_calls: list[str] = []
        outputs: list[str] = []
        success = True
        for step in plan.steps:
            try:
                name, output = self._execute_step(step, task)
                tool_calls.append(f"{name}: {output}")
                outputs.append(output)
            except ToolError as exc:
                tool_calls.append(f"error: {exc}")
                outputs.append(str(exc))
                success = False
                break

        result = outputs[-1] if outputs else "No output"
        reflection = "Completed task" if success else "Encountered a tool error"
        reward = self.reward_engine.compute(
            success=success,
            task=task,
            steps_used=len(plan.steps),
            reused_trace=reused_trace,
        ).as_dict()

        summary = f"{reflection}. Reward: {reward}"
        detail = f"Plan: {plan.title}\nSteps: {plan.steps}\nOutputs: {outputs}"
        self.memory.save_episode(
            user_context=user_context,
            task=task,
            plan=json.dumps(plan.__dict__),
            thought_trace="plan executed",
            outcome=result,
            reward_signals=reward,
            episode_summary=summary,
            episode_detail=detail,
            timestamp=datetime.utcnow().isoformat(),
        )

        self.models.update_after_episode(success=success, task=task, reflection=reflection)

        return ExecutionResult(
            plan=plan,
            tool_calls=tool_calls,
            result=result,
            reflection=summary,
            reward=reward,
        )
