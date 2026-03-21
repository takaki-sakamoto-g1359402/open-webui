from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from realitybridge_core.config import get_settings
from realitybridge_core.domain.enums import BridgeMode, PolicyDecisionOutcome, PolicyEffect, TaskState
from realitybridge_core.domain.models import Policy, PolicyDecision, Task

settings = get_settings()


@dataclass(slots=True)
class EvaluationResult:
    outcome: PolicyDecisionOutcome
    rationale: str
    policy_id: str | None
    context: dict[str, Any]
    task_state: TaskState


class PolicyService:
    def evaluate_task(self, session: Session, task: Task) -> EvaluationResult:
        policies = list(
            session.execute(
                select(Policy).where(Policy.applies_to.in_([task.kind, "task:*", "task.coordinate"]))
            ).scalars()
        )

        if task.sensitive:
            return EvaluationResult(
                outcome=PolicyDecisionOutcome.DENIED,
                rationale="Sensitive tasks are denied by default until a narrower policy is added.",
                policy_id=None,
                context={"default_deny": True},
                task_state=TaskState.DENIED,
            )

        for policy in policies:
            max_risk = policy.rules.get("max_risk")
            risk = task.payload.get("risk")
            if max_risk is not None and risk is not None and risk > max_risk:
                return EvaluationResult(
                    outcome=PolicyDecisionOutcome.DENIED,
                    rationale=f"Risk score {risk} exceeds policy threshold {max_risk}.",
                    policy_id=policy.id,
                    context={"risk": risk, "max_risk": max_risk},
                    task_state=TaskState.DENIED,
                )
            if policy.effect == PolicyEffect.DENY.value:
                return EvaluationResult(
                    outcome=PolicyDecisionOutcome.DENIED,
                    rationale="Explicit deny policy matched.",
                    policy_id=policy.id,
                    context=policy.rules,
                    task_state=TaskState.DENIED,
                )
            if policy.effect == PolicyEffect.ALLOW.value:
                return EvaluationResult(
                    outcome=PolicyDecisionOutcome.APPROVED,
                    rationale="Allow policy matched.",
                    policy_id=policy.id,
                    context=policy.rules,
                    task_state=TaskState.APPROVED,
                )

        return EvaluationResult(
            outcome=PolicyDecisionOutcome.APPROVED,
            rationale="No blocking policy matched and task is within simulation-safe defaults.",
            policy_id=None,
            context={"simulation_mode": settings.simulation_mode},
            task_state=TaskState.APPROVED,
        )

    def evaluate_device_action(
        self, session: Session, *, device_id: str, requested_mode: BridgeMode, action: str
    ) -> EvaluationResult:
        _ = session
        if requested_mode == BridgeMode.PHYSICAL and (
            settings.simulation_mode or not settings.allow_device_execution
        ):
            return EvaluationResult(
                outcome=PolicyDecisionOutcome.DENIED,
                rationale="Physical device execution is blocked by platform safety defaults.",
                policy_id=None,
                context={"device_id": device_id, "action": action},
                task_state=TaskState.DENIED,
            )

        return EvaluationResult(
            outcome=PolicyDecisionOutcome.APPROVED,
            rationale="Device action is permitted in simulation mode.",
            policy_id=None,
            context={"device_id": device_id, "action": action},
            task_state=TaskState.APPROVED,
        )

    def persist_decision(
        self,
        session: Session,
        *,
        subject_type: str,
        subject_id: str,
        outcome: PolicyDecisionOutcome,
        rationale: str,
        context: dict[str, Any],
        task_id: str | None = None,
        policy_id: str | None = None,
    ) -> PolicyDecision:
        decision = PolicyDecision(
            policy_id=policy_id,
            task_id=task_id,
            subject_type=subject_type,
            subject_id=subject_id,
            outcome=outcome.value,
            rationale=rationale,
            context=context,
        )
        session.add(decision)
        session.flush()
        return decision


policy_service = PolicyService()
