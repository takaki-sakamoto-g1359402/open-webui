from __future__ import annotations

from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel

from hmos.approvals import ApprovalRequest, create_approval
from hmos.event_bus import InMemoryEventBus
from hmos.kill_switch import disable_kill_switch, enable_kill_switch
from hmos.orchestrator import Orchestrator
from hmos.settings import settings
from hmos.storage import Storage

app = FastAPI(title="HM-OS MVP", version="0.1.0")

storage = Storage(settings.sqlite_path)
event_bus = InMemoryEventBus()
orchestrator = Orchestrator(storage, event_bus, settings)


class RunRequest(BaseModel):
    goal: str


class ApprovalResponse(BaseModel):
    approval_id: str


def verify_token(x_api_token: str | None = Header(default=None)) -> None:
    if settings.api_token and x_api_token != settings.api_token:
        raise HTTPException(status_code=401, detail="Invalid API token")


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/runs")
def create_run(request: RunRequest, _: None = Depends(verify_token)) -> dict:
    result = orchestrator.run(request.goal)
    return {"run_id": result.run_id, "trace_id": result.trace_id, "status": result.status.value}


@app.get("/runs/{run_id}/steps")
def list_steps(run_id: str, _: None = Depends(verify_token)) -> dict:
    steps = storage.get_steps_for_run(run_id)
    return {"steps": [dict(step) for step in steps]}


@app.get("/audit")
def list_audit(_: None = Depends(verify_token)) -> dict:
    return {"events": [dict(row) for row in storage.list_audit_events()]}


@app.post("/approvals/{step_id}", response_model=ApprovalResponse)
def approve_step(step_id: str, _: None = Depends(verify_token)) -> ApprovalResponse:
    step = storage.get_step(step_id)
    if not step:
        raise HTTPException(status_code=404, detail="Step not found")
    approval_id = create_approval(
        storage,
        ApprovalRequest(
            run_id=step["run_id"],
            step_id=step_id,
            summary=step["description"],
            destination=step["connector"],
            payload_hash=step["payload_hash"],
        ),
    )
    return ApprovalResponse(approval_id=approval_id)


@app.post("/kill-switch/enable")
def kill_switch_enable(_: None = Depends(verify_token)) -> dict:
    enable_kill_switch(storage)
    return {"enabled": True}


@app.post("/kill-switch/disable")
def kill_switch_disable(_: None = Depends(verify_token)) -> dict:
    disable_kill_switch(storage)
    return {"enabled": False}
