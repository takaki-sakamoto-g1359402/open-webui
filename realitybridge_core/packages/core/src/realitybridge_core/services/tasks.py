from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from realitybridge_core.domain.enums import BridgeMode, TaskState
from realitybridge_core.domain.models import Task, TaskRun
from realitybridge_core.services.audit import record_audit
from realitybridge_core.services.bridges import SimulationBridgeAdapter
from realitybridge_core.services.events import DomainEvent, EventPublisher
from realitybridge_core.services.policy import policy_service

logger = logging.getLogger(__name__)
PROCESSABLE_TASK_STATES = {TaskState.SUBMITTED.value}
TERMINAL_TASK_STATES = {
    TaskState.DENIED.value,
    TaskState.COMPLETED.value,
    TaskState.FAILED.value,
    TaskState.SIMULATED.value,
}


class TaskProcessingConflict(Exception):
    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


@dataclass(slots=True)
class TaskProcessResult:
    task_run: TaskRun
    created: bool


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

    def get_latest_run(self, session: Session, task_id: str) -> TaskRun | None:
        return session.execute(
            select(TaskRun).where(TaskRun.task_id == task_id).order_by(TaskRun.created_at.desc())
        ).scalar_one_or_none()

    def process_task(self, session: Session, task: Task) -> TaskProcessResult:
        latest_run = self.get_latest_run(session, task.id)
        if latest_run is not None:
            logger.info(
                "task.process.skipped_existing_run",
                extra={"extra": {"task_id": task.id, "task_state": task.state}},
            )
            return TaskProcessResult(task_run=latest_run, created=False)

        if task.state in TERMINAL_TASK_STATES:
            raise TaskProcessingConflict(f"Task is already {task.state}.")
        if task.state not in PROCESSABLE_TASK_STATES:
            raise TaskProcessingConflict(f"Task cannot be processed from state {task.state}.")

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
            return TaskProcessResult(task_run=task_run, created=True)

        task.state = TaskState.EXECUTING.value
        if task.kind.startswith("device."):
            bridge_result = self.bridge_adapter.execute(
                device_id=str(task.payload.get("device_id", "unknown")),
                action=task.kind,
                payload=task.payload,
            )
            final_state = (
                TaskState.SIMULATED if bridge_result.mode.value == BridgeMode.SIMULATION.value else TaskState.COMPLETED
            )
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
            return TaskProcessResult(task_run=task_run, created=True)

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
        return TaskProcessResult(task_run=task_run, created=True)

    def request_device_action(
        self,
        session: Session,
        *,
        actor_id: str,
        device_id: str,
        action: str,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        requested_mode = BridgeMode(str(payload.get("mode", BridgeMode.SIMULATION.value)))
        evaluation = policy_service.evaluate_device_action(
            session,
            device_id=device_id,
            requested_mode=requested_mode,
            action=action,
        )
        policy_service.persist_decision(
            session,
            subject_type="device_action",
            subject_id=device_id,
            task_id=None,
            policy_id=evaluation.policy_id,
            outcome=evaluation.outcome,
            rationale=evaluation.rationale,
            context={**evaluation.context, "requested_mode": requested_mode.value},
        )

        if evaluation.task_state == TaskState.DENIED:
            record_audit(
                session,
                actor_type="user",
                actor_id=actor_id,
                action="device.action.blocked",
                target_type="device",
                target_id=device_id,
                severity="warning",
                details={"action": action, "reason": evaluation.rationale},
            )
            self.event_publisher.publish(
                DomainEvent(
                    event_type="robot.action.blocked",
                    aggregate_id=device_id,
                    payload={"device_id": device_id, "action": action, "reason": evaluation.rationale},
                    actor_id=actor_id,
                )
            )
            session.flush()
            return {
                "accepted": False,
                "mode": requested_mode.value,
                "status": "blocked",
                "message": evaluation.rationale,
                "payload": {"device_id": device_id, "action": action},
            }

        record_audit(
            session,
            actor_type="user",
            actor_id=actor_id,
            action="device.action.requested",
            target_type="device",
            target_id=device_id,
            severity="info",
            details={"action": action, "requested_mode": requested_mode.value},
        )
        self.event_publisher.publish(
            DomainEvent(
                event_type="robot.action.requested",
                aggregate_id=device_id,
                payload={"device_id": device_id, "action": action, "mode": requested_mode.value},
                actor_id=actor_id,
            )
        )
        bridge_result = self.bridge_adapter.execute(device_id=device_id, action=action, payload=payload)
        session.flush()
        return {
            "accepted": bridge_result.accepted,
            "mode": bridge_result.mode.value,
            "status": "accepted",
            "message": bridge_result.message,
            "payload": bridge_result.payload,
        }
