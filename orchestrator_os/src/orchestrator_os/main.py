from __future__ import annotations

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from orchestrator_os.core.models import TaskRequest, TaskResult
from orchestrator_os.core.orchestrator import build_runtime
from orchestrator_os.storage.approval_store import ApprovalStore
from orchestrator_os.storage.audit_store import AuditStore

app = FastAPI(title="Orchestrator OS")
runtime = build_runtime()
audit_store = AuditStore()
approval_store = ApprovalStore()


class ApprovalDecisionBody(BaseModel):
    decision: str
    reason: str
    decided_by: str


@app.post("/tasks", response_model=TaskResult)
def create_task(request: TaskRequest) -> TaskResult:
    return runtime.run(request)


@app.get("/tasks/{task_id}", response_model=TaskResult)
def get_task(task_id: str) -> TaskResult:
    try:
        return runtime.get_task(task_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/audit/{task_id}")
def get_audit(task_id: str):
    return [e.model_dump() for e in audit_store.list_events(task_id)]


@app.get("/approvals")
def list_approvals():
    return [a.model_dump() for a in approval_store.pending()]


@app.post("/approvals/{approval_id}/decision")
def decide_approval(approval_id: str, body: ApprovalDecisionBody):
    approve = body.decision.upper() == "APPROVE"
    return approval_store.decide(approval_id, approve=approve, reason=body.reason, decided_by=body.decided_by)


@app.post("/tasks/{task_id}/resume", response_model=TaskResult)
def resume_task(task_id: str) -> TaskResult:
    return runtime.resume(task_id)
