from __future__ import annotations

import asyncio
import contextlib
import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID

from app.agents.specialists import AgentPlanStep, SpecialistAgent
from app.policy.engine import PolicyEngine
from app.schemas.enums import ApprovalStatus, PermissionLevel, TaskStatus
from app.schemas.models import ApprovalRequest, AuditLogEntry, EvidenceRef, EventRecord, ToolCallContext
from app.storage.repository import (
    ApprovalRepository,
    AuditRepository,
    EventRepository,
    MemoryRepository,
    PolicyRepository,
    TaskRepository,
)
from app.tools.registry import ToolRegistry
from app.utils.config import AppConfig

logger = logging.getLogger(__name__)


EVENT_AGENT_ROUTING: dict[str, str] = {
    "customer_complaint": "AI2",
    "invoice_request": "AI3",
    "sales_lead": "AI1",
    "system_alert": "AI4",
    "tool_misuse_attempt": "AI4",
}


@dataclass(slots=True)
class OrchestratorDependencies:
    config: AppConfig
    policy_engine: PolicyEngine
    tool_registry: ToolRegistry
    agents: dict[str, SpecialistAgent]
    events: EventRepository
    tasks: TaskRepository
    approvals: ApprovalRepository
    audit: AuditRepository
    policies: PolicyRepository
    memories: MemoryRepository


@dataclass(slots=True)
class OrchestratorEngine:
    deps: OrchestratorDependencies
    running: bool = False
    _loop_task: asyncio.Task[None] | None = None
    _lock: asyncio.Lock = field(default_factory=asyncio.Lock)

    async def start(self) -> None:
        if self.running:
            return
        self.running = True
        self._loop_task = asyncio.create_task(self._run_loop(), name="ai-orchestrator-loop")
        logger.info("orchestrator_started", extra={"extra": {"poll_interval": self.deps.config.orchestrator.poll_interval_seconds}})

    async def stop(self) -> None:
        self.running = False
        if self._loop_task:
            self._loop_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._loop_task
        logger.info("orchestrator_stopped")

    async def _run_loop(self) -> None:
        poll_interval = self.deps.config.orchestrator.poll_interval_seconds
        while self.running:
            await self.process_pending_events()
            await self.process_pending_tasks()
            await asyncio.sleep(poll_interval)

    async def process_pending_events(self) -> None:
        if self._lock.locked():
            return
        async with self._lock:
            new_events = self.deps.events.list_new()
            for event in new_events:
                await self._process_event(event)

    async def process_pending_tasks(self) -> None:
        pending_tasks = self.deps.tasks.list_by_status(TaskStatus.PENDING)
        for task in pending_tasks:
            approval = self.deps.approvals.get(task.approval_id) if task.approval_id else None
            if approval and approval.status is not ApprovalStatus.APPROVED:
                continue
            await self._execute_pending_task(task)

    async def _process_event(self, event: EventRecord) -> None:
        trace_id = event.trace_id
        self.deps.events.update_status(event.id, "processing")
        self._remember(trace_id, kind="short_term", key="event", value=event.model_dump(mode="python"))

        agent = self._select_agent(event.type)
        steps = agent.plan(event.type, event.payload)
        steps = steps[: self.deps.config.orchestrator.max_steps_per_event]
        logger.info(
            "event_planned",
            extra={"extra": {"trace_id": str(trace_id), "event_id": event.id, "steps": len(steps), "agent": agent.agent_id}},
        )

        for step in steps:
            decision = self.deps.policy_engine.evaluate_tool_call(
                tool_name=step.tool_name,
                requested_level=step.permission_level,
                payload={**step.input_payload, **event.payload},
                tool_required_level=self.deps.tool_registry.get(step.tool_name).required_level,
                agent_allowed=step.tool_name in agent.allowed_tools,
            )
            self.deps.policies.record(trace_id, None, decision)
            if decision.kill_switch:
                await self._handle_kill_switch(event, step, decision)
                return
            if decision.requires_approval or decision.required_level >= PermissionLevel.L4_HIGH_RISK:
                await self._queue_for_approval(event, step, decision)
                self.deps.events.update_status(event.id, "held")
                return
            await self._execute_step(event, step, decision)

        self.deps.events.update_status(event.id, "processed")

    def _select_agent(self, event_type: str) -> SpecialistAgent:
        agent_id = EVENT_AGENT_ROUTING.get(event_type, "AI4")
        return self.deps.agents[agent_id]

    async def _execute_step(self, event: EventRecord, step: AgentPlanStep, decision: Any) -> None:
        trace_id = event.trace_id
        task = self.deps.tasks.create(
            trace_id=trace_id,
            event_id=event.id,
            agent_id=step.agent_id,
            tool_name=step.tool_name,
            permission_level=int(decision.required_level),
            status=TaskStatus.RUNNING,
            requires_approval=False,
            input_payload={
                **step.input_payload,
                "evidence": step.evidence,
                "uncertainty": step.uncertainty,
                "rationale": step.rationale,
            },
        )

        ctx = ToolCallContext(
            trace_id=trace_id,
            task_id=task.id,
            agent_id=step.agent_id,
            permission_level=decision.required_level,
            evidence=[EvidenceRef(source="agent", detail=e) for e in step.evidence],
            metadata={"uncertainty": step.uncertainty, "rationale": step.rationale},
        )
        tool = self.deps.tool_registry.get(step.tool_name)
        result = await tool.handler(ctx, step.input_payload)

        post_decision = self.deps.policy_engine.evaluate_post_check(
            tool_name=step.tool_name,
            result={**result.output, "post_check_failed": result.post_check_failed},
            required_level=decision.required_level,
        )
        self.deps.policies.record(trace_id, task.id, post_decision)

        audit_entry = AuditLogEntry(
            trace_id=trace_id,
            actor=step.agent_id,
            action=f"tool:{step.tool_name}",
            permission_level=decision.required_level,
            input=step.input_payload,
            output=result.output,
            policy_decision={
                "pre": decision.model_dump(mode="python"),
                "post": post_decision.model_dump(mode="python"),
            },
            evidence=result.evidence,
        )
        self.deps.audit.log(audit_entry)

        if not post_decision.allowed and tool.rollback_handler:
            await tool.rollback_handler(ctx, step.input_payload, result.output)
            self.deps.tasks.update_status(task.id, TaskStatus.ESCALATED, {"rolled_back": True, **result.output})
            await self._queue_for_approval(event, step, post_decision, task_id=task.id)
            self.deps.events.update_status(event.id, "held")
            return

        final_status = TaskStatus.COMPLETED if result.success and post_decision.allowed else TaskStatus.FAILED
        self.deps.tasks.update_status(task.id, final_status, result.output)
        self._remember(
            trace_id,
            kind="short_term",
            key=f"task:{task.id}",
            value={
                "tool": step.tool_name,
                "status": final_status.value,
                "output": result.output,
            },
        )
        if final_status is TaskStatus.FAILED:
            await self._queue_for_approval(event, step, post_decision, task_id=task.id)
            self.deps.events.update_status(event.id, "held")

    async def _execute_pending_task(self, task: Any) -> None:
        tool = self.deps.tool_registry.get(task.tool_name)
        trace_id = task.trace_id
        self.deps.tasks.update_status(task.id, TaskStatus.RUNNING, {"approval": "executing"})
        ctx = ToolCallContext(
            trace_id=trace_id,
            task_id=task.id,
            agent_id=task.agent_id,
            permission_level=PermissionLevel(task.permission_level),
            evidence=[EvidenceRef(source="approval", detail=str(task.approval_id))],
            metadata={"resumed": True},
        )
        payload = {k: v for k, v in task.input.items() if k not in {"evidence", "uncertainty", "rationale", "kill_switch"}}
        result = await tool.handler(ctx, payload)
        post_decision = self.deps.policy_engine.evaluate_post_check(
            tool_name=task.tool_name,
            result={**result.output, "post_check_failed": result.post_check_failed},
            required_level=PermissionLevel(task.permission_level),
        )
        self.deps.policies.record(trace_id, task.id, post_decision)
        self.deps.audit.log(
            AuditLogEntry(
                trace_id=trace_id,
                actor=task.agent_id,
                action=f"tool:{task.tool_name}:resumed",
                permission_level=PermissionLevel(task.permission_level),
                input=payload,
                output=result.output,
                policy_decision={"post": post_decision.model_dump(mode="python")},
                evidence=result.evidence,
            )
        )
        if not post_decision.allowed and tool.rollback_handler:
            await tool.rollback_handler(ctx, payload, result.output)
            self.deps.tasks.update_status(task.id, TaskStatus.ESCALATED, {"rolled_back": True, **result.output})
            return
        final_status = TaskStatus.COMPLETED if result.success and post_decision.allowed else TaskStatus.FAILED
        self.deps.tasks.update_status(task.id, final_status, result.output)

    async def _queue_for_approval(
        self,
        event: EventRecord,
        step: AgentPlanStep,
        decision: Any,
        *,
        task_id: int | None = None,
    ) -> None:
        trace_id = event.trace_id
        if task_id is None:
            task = self.deps.tasks.create(
                trace_id=trace_id,
                event_id=event.id,
                agent_id=step.agent_id,
                tool_name=step.tool_name,
                permission_level=int(decision.required_level),
                status=TaskStatus.HOLD,
                requires_approval=True,
                input_payload={
                    **step.input_payload,
                    "evidence": step.evidence,
                    "uncertainty": step.uncertainty,
                    "rationale": step.rationale,
                },
            )
            task_id = task.id
        approval = self.deps.approvals.create(
            ApprovalRequest(
                task_id=task_id,
                trace_id=trace_id,
                reason=",".join(decision.reasons or ["approval_required"]),
                required_level=decision.required_level,
                details={
                    "event_type": event.type,
                    "tool_name": step.tool_name,
                    "payload": step.input_payload,
                    "policy_reasons": decision.reasons,
                    "escalation_reasons": decision.escalation_reasons,
                },
            )
        )
        self.deps.tasks.attach_approval(task_id, approval.id)
        self._remember(
            trace_id,
            kind="short_term",
            key=f"approval:{approval.id}",
            value=approval.model_dump(mode="python"),
        )
        logger.warning(
            "approval_queued",
            extra={
                "extra": {
                    "trace_id": str(trace_id),
                    "task_id": task_id,
                    "approval_id": approval.id,
                    "reasons": decision.reasons,
                }
            },
        )

    async def _handle_kill_switch(self, event: EventRecord, step: AgentPlanStep, decision: Any) -> None:
        trace_id = event.trace_id
        task = self.deps.tasks.create(
            trace_id=trace_id,
            event_id=event.id,
            agent_id=step.agent_id,
            tool_name=step.tool_name,
            permission_level=int(decision.required_level),
            status=TaskStatus.ESCALATED,
            requires_approval=True,
            input_payload={
                **step.input_payload,
                "evidence": step.evidence,
                "uncertainty": step.uncertainty,
                "rationale": step.rationale,
                "kill_switch": True,
            },
        )
        approval = self.deps.approvals.create(
            ApprovalRequest(
                task_id=task.id,
                trace_id=trace_id,
                reason="kill_switch_triggered",
                required_level=max(decision.required_level, PermissionLevel.L3_EXECUTE_CONDITIONAL),
                details={
                    "event_type": event.type,
                    "tool_name": step.tool_name,
                    "policy_reasons": decision.reasons,
                    "escalation_reasons": decision.escalation_reasons,
                },
            )
        )
        self.deps.tasks.attach_approval(task.id, approval.id)
        self.deps.events.update_status(event.id, "held")
        logger.error(
            "kill_switch_triggered",
            extra={
                "extra": {
                    "trace_id": str(trace_id),
                    "event_id": event.id,
                    "task_id": task.id,
                    "approval_id": approval.id,
                    "reasons": decision.reasons,
                    "escalation_reasons": decision.escalation_reasons,
                }
            },
        )

    def _remember(self, trace_id: UUID, *, kind: str, key: str, value: dict[str, Any]) -> None:
        self.deps.memories.put(trace_id, kind=kind, key=key, value=value)

    def process_approval_action(
        self,
        approval_id: int,
        *,
        actor: str,
        action: str,
        reason: str | None,
        override_scope: dict[str, Any] | None,
        override_ttl_seconds: int | None,
    ) -> Any:
        approval = self.deps.approvals.get(approval_id)
        expires_at = None
        if override_scope and override_ttl_seconds:
            expires_at = datetime.now(tz=timezone.utc) + timedelta(seconds=override_ttl_seconds)

        if action == "approve":
            status = ApprovalStatus.APPROVED
        elif action == "deny":
            status = ApprovalStatus.DENIED
        else:
            status = ApprovalStatus.ALTERNATIVE_REQUESTED

        updated = self.deps.approvals.update_status(
            approval_id,
            status=status,
            decided_by=actor,
            decided_reason=reason,
            override_scope=override_scope,
            expires_at=expires_at,
        )

        task = self.deps.tasks.get(updated.task_id)
        if status is ApprovalStatus.APPROVED:
            self.deps.tasks.update_status(task.id, TaskStatus.PENDING, {"approval": "approved"})
        elif status is ApprovalStatus.DENIED:
            self.deps.tasks.update_status(task.id, TaskStatus.FAILED, {"approval": "denied"})
        else:
            self.deps.tasks.update_status(task.id, TaskStatus.HOLD, {"approval": "alternatives_requested"})

        return updated
