from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from realitybridge_core.domain.enums import TaskState
from realitybridge_core.domain.models import Task, TaskRun
from realitybridge_core.services.audit import record_audit
from realitybridge_core.services.bridges import SimulationBridgeAdapter
from realitybridge_core.services.events import DomainEvent, EventPublisher
from realitybridge_core.services.policy import policy_service


class TaskService:
    def __init__(self, event_publisher: EventPublisher):
        self.event_publisher = event_publisher
        self.bridge_adapter = SimulationBridgeAdapter()

    def submit_task(
        self,
        session: Session,
        *,
        task: Task,
        actor_id: str,
        request_id: str = "",
    ) -> Task:
        session.add(task)
        session.flush()
        record_audit(
            session,
            actor_type="user",
            actor_id=actor_id,
            action="task.submitted",
            target_type="task",
            target_id=task.id,
            severity="info",
            request_id=request_id,
            details={"kind": task.kind, "sensitive": task.sensitive},
        )
        self.event_publisher.publish(
            DomainEvent(
                event_type="task.submitted",
                aggregate_id=task.id,
                payload={"task_id": task.id, "kind": task.kind, "payload": task.payload},
                actor_id=actor_id,
            )
        )
        return task

    def process_task(self, session: Session, task: Task) -> TaskRun:
        task.state = TaskState.POLICY_PENDING.value
        evaluation = policy_service.evaluate_task(session, task)
        policy_service.persist_decision(
            session,
            subject_type="task",
            subject_id=task.id,
            task_id=task.id,
            policy_id=evaluation.policy_id,
            outcome=evaluation.outcome,
            rationale=evaluation.rationale,
            context=evaluation.context,
        )

        if evaluation.task_state == TaskState.DENIED:
            task.state = TaskState.DENIED.value
            task_run = TaskRun(
                task_id=task.id,
                execution_mode="blocked",
                state=TaskState.DENIED.value,
                logs={"policy": evaluation.rationale},
                result={"status": "blocked"},
            )
            session.add(task_run)
            self.event_publisher.publish(
                DomainEvent(
                    event_type="policy.denied",
                    aggregate_id=task.id,
                    payload={"task_id": task.id, "reason": evaluation.rationale},
                    actor_id=task.submitted_by_id,
                )
            )
            session.flush()
            return task_run

        task.state = TaskState.EXECUTING.value
        if task.kind.startswith("device."):
            bridge_result = self.bridge_adapter.execute(
                device_id=str(task.payload.get("device_id", "unknown")),
                action=task.kind,
                payload=task.payload,
            )
            final_state = TaskState.SIMULATED if bridge_result.mode.value == "simulation" else TaskState.COMPLETED
            task.state = final_state.value
            task_run = TaskRun(
                task_id=task.id,
                execution_mode=bridge_result.mode.value,
                state=final_state.value,
                logs={"bridge_message": bridge_result.message},
                result=bridge_result.payload,
            )
            session.add(task_run)
            self.event_publisher.publish(
                DomainEvent(
                    event_type="robot.action.simulated",
                    aggregate_id=task.id,
                    payload={"task_id": task.id, "mode": bridge_result.mode.value},
                    actor_id=task.submitted_by_id,
                )
            )
            session.flush()
            return task_run

        task.state = TaskState.COMPLETED.value
        task_run = TaskRun(
            task_id=task.id,
            execution_mode="simulation",
            state=TaskState.COMPLETED.value,
            logs={"message": "Task completed in simulation-safe scaffold mode."},
            result={"echo": task.payload},
        )
        session.add(task_run)
        self.event_publisher.publish(
            DomainEvent(
                event_type="task.executed",
                aggregate_id=task.id,
                payload={"task_id": task.id, "state": task.state},
                actor_id=task.submitted_by_id,
            )
        )
        session.flush()
        return task_run

    def request_device_action(
        self,
        session: Session,
        *,
        actor_id: str,
        device_id: str,
        action: str,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        _ = session
        bridge_result = self.bridge_adapter.execute(device_id=device_id, action=action, payload=payload)
        self.event_publisher.publish(
            DomainEvent(
                event_type="robot.action.requested",
                aggregate_id=device_id,
                payload={"device_id": device_id, "action": action},
                actor_id=actor_id,
            )
        )
        return {
            "accepted": bridge_result.accepted,
            "mode": bridge_result.mode.value,
            "message": bridge_result.message,
            "payload": bridge_result.payload,
        }
