from __future__ import annotations

import uuid
from dataclasses import dataclass
from typing import Dict, List

from hmos.approvals import ApprovalRequest, create_approval, has_approval
from hmos.audit import build_audit_event, serialize_event_data
from hmos.connectors.file_system import FileSystemConnector
from hmos.connectors.http_api import HttpApiConnector
from hmos.connectors.humanoid import HumanoidConnector
from hmos.connectors.web_search import WebSearchConnector
from hmos.event_bus import Event, EventBus
from hmos.kill_switch import is_kill_switch_enabled
from hmos.models import PlanStep, RiskLevel, RunStatus, StepStatus
from hmos.policy import evaluate_risk
from hmos.settings import Settings
from hmos.storage import Storage
from hmos.utils.canonical_json import canonical_dumps


@dataclass(frozen=True)
class RunResult:
    run_id: str
    trace_id: str
    status: RunStatus


class Orchestrator:
    def __init__(self, storage: Storage, event_bus: EventBus, settings: Settings) -> None:
        self._storage = storage
        self._event_bus = event_bus
        self._settings = settings
        self._connectors = {
            "web_search": WebSearchConnector(),
            "file_system": FileSystemConnector(settings.file_sandbox_root),
            "humanoid": HumanoidConnector(),
            "http_api": HttpApiConnector(storage, settings.http_allowlist),
        }

    def run(self, goal: str) -> RunResult:
        run_id = str(uuid.uuid4())
        trace_id = str(uuid.uuid4())
        self._storage.create_run(run_id, goal, RunStatus.CREATED)
        self._publish_event(trace_id, "GOAL_CREATED", {"run_id": run_id, "goal": goal})

        steps = self._plan(goal, run_id)
        self._storage.add_steps(steps)
        self._publish_event(trace_id, "PLAN_CREATED", {"run_id": run_id, "steps": [s.step_id for s in steps]})

        self._storage.update_run_status(run_id, RunStatus.RUNNING)
        for step in self._storage.get_steps_for_run(run_id):
            if is_kill_switch_enabled(self._storage):
                self._storage.update_run_status(run_id, RunStatus.HALTED)
                return RunResult(run_id, trace_id, RunStatus.HALTED)

            result = self._execute_step(trace_id, step)
            if result == StepStatus.FAILED:
                self._storage.update_run_status(run_id, RunStatus.FAILED)
                return RunResult(run_id, trace_id, RunStatus.FAILED)

        self._storage.update_run_status(run_id, RunStatus.COMPLETED)
        return RunResult(run_id, trace_id, RunStatus.COMPLETED)

    def _plan(self, goal: str, run_id: str) -> List[PlanStep]:
        steps: List[PlanStep] = []
        steps.append(
            PlanStep(
                step_id=str(uuid.uuid4()),
                run_id=run_id,
                index=0,
                description="Summarize goal",
                connector="web_search",
                payload={"query": goal},
                risk_level=RiskLevel.RISK0,
            )
        )
        if "automation" in goal.lower() or "http" in goal.lower():
            payload = {"url": f"https://{self._settings.http_allowlist[0]}/post", "method": "POST", "body": {"goal": goal}}
            steps.append(
                PlanStep(
                    step_id=str(uuid.uuid4()),
                    run_id=run_id,
                    index=1,
                    description="Invoke HTTP automation",
                    connector="http_api",
                    payload=payload,
                    risk_level=RiskLevel.RISK2,
                )
            )
        steps.append(
            PlanStep(
                step_id=str(uuid.uuid4()),
                run_id=run_id,
                index=len(steps),
                description="Check humanoid status",
                connector="humanoid",
                payload={"command": "status"},
                risk_level=RiskLevel.RISK1,
            )
        )
        return steps

    def _execute_step(self, trace_id: str, step_row) -> StepStatus:
        step_id = step_row["id"]
        risk_level = RiskLevel(step_row["risk_level"])
        decision = evaluate_risk(risk_level)
        self._publish_event(trace_id, "STEP_PROPOSED", {"step_id": step_id, "risk": risk_level.value})

        if not decision.allowed:
            self._storage.update_step_status(step_id, StepStatus.FAILED)
            self._publish_event(trace_id, "STEP_FAILED", {"step_id": step_id, "reason": decision.reason})
            return StepStatus.FAILED

        if decision.requires_approval and not has_approval(self._storage, step_id):
            self._storage.update_step_status(step_id, StepStatus.APPROVAL_REQUIRED)
            approval_request = ApprovalRequest(
                run_id=step_row["run_id"],
                step_id=step_id,
                summary=step_row["description"],
                destination=step_row["connector"],
                payload_hash=step_row["payload_hash"],
            )
            create_approval(self._storage, approval_request)
            self._publish_event(trace_id, "STEP_APPROVED", {"step_id": step_id, "status": "pending"})
            return StepStatus.APPROVAL_REQUIRED

        self._publish_event(trace_id, "STEP_APPROVED", {"step_id": step_id, "status": "approved"})
        connector = self._connectors[step_row["connector"]]
        payload = json_loads(step_row["payload_json"])
        if connector.name == "http_api":
            payload_hash = step_row["payload_hash"]
            payload["idempotency_key"] = f"{step_row['run_id']}:{step_id}:{connector.name}:{payload_hash}"

        result = connector.execute(payload)
        if result.idempotency_key:
            self._publish_event(trace_id, "STEP_EXECUTED", {"step_id": step_id, "idempotency_key": result.idempotency_key})
        else:
            self._publish_event(trace_id, "STEP_EXECUTED", {"step_id": step_id})
        self._storage.update_step_status(step_id, StepStatus.EXECUTED)
        return StepStatus.EXECUTED

    def _publish_event(self, trace_id: str, event_type: str, data: Dict[str, str]) -> None:
        prev_hash = self._storage.get_last_audit_hash()
        audit_event = build_audit_event(trace_id, event_type, data, prev_hash)
        self._storage.insert_audit_event(
            audit_event.schema_version,
            audit_event.timestamp_utc,
            audit_event.trace_id,
            audit_event.event_type,
            serialize_event_data(audit_event.data),
            audit_event.prev_hash,
            audit_event.event_hash,
        )
        self._event_bus.publish(Event(event_type=event_type, trace_id=trace_id, payload=data))


def json_loads(payload: str) -> Dict[str, str]:
    import json

    return json.loads(payload)
