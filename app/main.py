from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID

from fastapi import FastAPI, Query
from fastapi.responses import ORJSONResponse

from app.orchestrator.bootstrap import ApplicationContainer, build_container
from app.schemas.enums import ApprovalStatus
from app.schemas.models import ApprovalAction, EventCreate
from app.utils.config import get_config
from app.utils.logging import configure_logging

configure_logging()
config = get_config()
container: ApplicationContainer = build_container(config)

app = FastAPI(title="AI Orchestration System", default_response_class=ORJSONResponse)


@app.on_event("startup")
async def startup_event() -> None:
    await container.orchestrator.start()


@app.on_event("shutdown")
async def shutdown_event() -> None:
    container.orchestrator.running = False


@app.get("/health")
async def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "time": datetime.now(tz=timezone.utc).isoformat(),
        "orchestrator_running": container.orchestrator.running,
        "db_path": str(container.config.database.path),
    }


@app.post("/events")
async def create_event(event: EventCreate) -> dict[str, Any]:
    record = container.events.create(event)
    # Kick the worker loop immediately for responsiveness.
    await container.orchestrator.process_pending_events()
    return {"event": record.model_dump(mode="json")}


@app.get("/tasks")
async def list_tasks() -> dict[str, Any]:
    tasks = container.tasks.list()
    return {"tasks": [task.model_dump(mode="json") for task in tasks]}


@app.get("/approvals")
async def list_approvals(status: ApprovalStatus | None = Query(default=None)) -> dict[str, Any]:
    approvals = container.approvals.list_all(status)
    return {"approvals": [approval.model_dump(mode="json") for approval in approvals]}


@app.post("/approvals/action")
async def approval_action(action: ApprovalAction) -> dict[str, Any]:
    expires_at = None
    if action.override_scope and action.override_ttl_seconds:
        expires_at = datetime.now(tz=timezone.utc) + timedelta(seconds=action.override_ttl_seconds)
    updated = container.orchestrator.process_approval_action(
        action.approval_id,
        actor=action.actor,
        action=action.action,
        reason=action.reason,
        override_scope=action.override_scope,
        override_ttl_seconds=action.override_ttl_seconds,
    )
    # process pending tasks after approval
    await container.orchestrator.process_pending_tasks()
    return {"approval": updated.model_dump(mode="json"), "expires_at": expires_at.isoformat() if expires_at else None}


@app.get("/audit")
async def get_audit(trace_id: UUID) -> dict[str, Any]:
    entries = container.audit.list_by_trace(trace_id)
    return {
        "trace_id": str(trace_id),
        "entries": [entry.model_dump(mode="json") for entry in entries],
    }


@app.get("/memories/{trace_id}")
async def get_memories(trace_id: UUID, kind: str = Query(default="short_term")) -> dict[str, Any]:
    records = container.memories.list_by_trace(trace_id, kind)
    return {"memories": [record.model_dump(mode="json") for record in records]}
