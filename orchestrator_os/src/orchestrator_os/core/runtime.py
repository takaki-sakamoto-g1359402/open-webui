from __future__ import annotations

import json
from uuid import uuid4

from orchestrator_os.agents.critic import CriticAgent
from orchestrator_os.agents.planner import PlannerAgent
from orchestrator_os.agents.tool_router import ToolRouterAgent
from orchestrator_os.config import get_settings
from orchestrator_os.core.models import PolicyDecision, TaskRequest, TaskResult, TaskState, ToolCallRequest
from orchestrator_os.core.policy import PolicyEngine
from orchestrator_os.core.registry import ToolRegistry
from orchestrator_os.storage.approval_store import ApprovalStore
from orchestrator_os.storage.audit_store import AuditStore
from orchestrator_os.storage.db import get_connection
from orchestrator_os.storage.memory_store import MemoryStore


class Runtime:
    def __init__(
        self,
        planner: PlannerAgent,
        router: ToolRouterAgent,
        critic: CriticAgent,
        registry: ToolRegistry,
        policy: PolicyEngine,
    ) -> None:
        self.planner = planner
        self.router = router
        self.critic = critic
        self.registry = registry
        self.policy = policy
        self.audit = AuditStore()
        self.approvals = ApprovalStore()
        self.memory = MemoryStore()

    def run(self, request: TaskRequest, task_id: str | None = None) -> TaskResult:
        settings = get_settings()
        if settings.orchestrator_disabled:
            raise RuntimeError("Execution blocked: ORCHESTRATOR_DISABLED=true")

        tid = task_id or str(uuid4())
        audit_ids: list[str] = []
        artifacts: list[str] = []

        audit_ids.append(self.audit.append_event(tid, "task_created", "riai", request.model_dump()).id)
        plan = self.planner.make_plan(request.goal)
        audit_ids.append(self.audit.append_event(tid, "plan_created", "planner", plan.model_dump()).id)

        for step in plan.steps:
            tool_name = self.router.choose_tool(step)
            spec = self.registry.get(tool_name)
            tool = spec.impl
            payload = self._build_tool_input(tool_name, request.goal, step.instruction)
            tool_req = ToolCallRequest(
                tool_name=tool_name,
                input=payload,
                requested_scopes=spec.required_scopes,
                justification=step.instruction,
            )
            sandbox_ok = tool.is_sandbox_safe(payload)
            decision = self.policy.evaluate(tool_name, spec.risk_tier, sandbox_ok)
            audit_ids.append(
                self.audit.append_event(tid, "policy_decision", "security", {**tool_req.model_dump(), **decision.__dict__}).id
            )
            if decision.decision == PolicyDecision.DENY:
                return self._save_task(
                    TaskResult(task_id=tid, state=TaskState.FAILED, summary=decision.reason, audit_event_ids=audit_ids)
                )
            if decision.decision == PolicyDecision.REQUIRE_APPROVAL:
                rec = self.approvals.create(
                    task_id=tid,
                    actor="executor",
                    tool_name=tool_name,
                    risk_tier=spec.risk_tier,
                    scopes=spec.required_scopes,
                    request_payload=tool_req.model_dump(),
                )
                audit_ids.append(
                    self.audit.append_event(tid, "approval_required", "security", rec.model_dump()).id
                )
                return self._save_task(
                    TaskResult(
                        task_id=tid,
                        state=TaskState.WAITING_FOR_APPROVAL,
                        summary="Execution paused for approval",
                        audit_event_ids=audit_ids,
                        approvals_pending=[rec.approval_id],
                    )
                )
            validated = self.registry.validate_input(tool_name, payload)
            attempt = 0
            result = None
            while attempt < min(step.max_attempts, 2):
                result = tool.run(validated)
                if self.critic.review(result):
                    break
                attempt += 1
            assert result is not None
            audit_ids.append(self.audit.append_event(tid, "tool_called", tool_name, result.model_dump()).id)
            if not result.ok:
                return self._save_task(
                    TaskResult(task_id=tid, state=TaskState.FAILED, summary=result.error or "Tool failed", audit_event_ids=audit_ids)
                )
            artifacts.extend(result.artifact_refs)
            self.memory.put(tid, f"step_{step.step_id}", result.output or {}, {"tool": tool_name})

        audit_ids.append(self.audit.append_event(tid, "task_completed", "riai", {"goal": request.goal}).id)
        return self._save_task(
            TaskResult(
                task_id=tid,
                state=TaskState.COMPLETED,
                summary="Task completed safely",
                artifacts=artifacts,
                audit_event_ids=audit_ids,
            )
        )

    def resume(self, task_id: str) -> TaskResult:
        approvals = self.approvals.for_task(task_id)
        if any(a.status == "DENIED" for a in approvals):
            return self._save_task(
                TaskResult(task_id=task_id, state=TaskState.FAILED, summary="Approval denied", approvals_pending=[])
            )
        pending = [a.approval_id for a in approvals if a.status == "PENDING"]
        if pending:
            return self.get_task(task_id)
        return self._save_task(
            TaskResult(task_id=task_id, state=TaskState.COMPLETED, summary="Resumed after approvals")
        )

    def get_task(self, task_id: str) -> TaskResult:
        with get_connection() as conn:
            row = conn.execute("SELECT * FROM tasks WHERE task_id=?", (task_id,)).fetchone()
        if row is None:
            raise KeyError("Task not found")
        return TaskResult(
            task_id=row["task_id"],
            state=row["state"],
            summary=row["summary"],
            artifacts=json.loads(row["artifacts_json"]),
            audit_event_ids=json.loads(row["audit_event_ids_json"]),
            approvals_pending=json.loads(row["approvals_pending_json"]),
        )

    def _save_task(self, result: TaskResult) -> TaskResult:
        with get_connection() as conn:
            conn.execute(
                """
                INSERT INTO tasks (task_id, state, summary, artifacts_json, audit_event_ids_json, approvals_pending_json)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(task_id)
                DO UPDATE SET
                  state=excluded.state,
                  summary=excluded.summary,
                  artifacts_json=excluded.artifacts_json,
                  audit_event_ids_json=excluded.audit_event_ids_json,
                  approvals_pending_json=excluded.approvals_pending_json
                """,
                (
                    result.task_id,
                    result.state,
                    result.summary,
                    json.dumps(result.artifacts),
                    json.dumps(result.audit_event_ids),
                    json.dumps(result.approvals_pending),
                ),
            )
            conn.commit()
        return result

    @staticmethod
    def _build_tool_input(tool_name: str, goal: str, instruction: str) -> dict:
        if tool_name == "echo":
            return {"message": goal}
        if tool_name == "filesystem":
            return {"action": "write", "path": "notes/goal.txt", "content": f"{goal}\n{instruction}"}
        if tool_name == "web_fetch":
            return {"url": "https://example.invalid/context"}
        return {}
