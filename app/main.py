from __future__ import annotations

import asyncio
import logging
import os
from contextlib import asynccontextmanager
from typing import Any

from fastapi import Depends, FastAPI, HTTPException
from fastapi.responses import ORJSONResponse

from app.agents.builtin import build_agents
from app.orchestrator.engine import OrchestratorContext, OrchestratorEngine
from app.policy.engine import PolicyConfig, PolicyEngine
from app.schemas.common import ActorType, AuditRecord, PermissionLevel, utcnow
from app.schemas.domain import ApprovalDecisionInput, AuditQuery, EventCreate, HealthResponse
from app.security.approvals import ApprovalService
from app.security.pqc import PQCSigner
from app.security.runtime import load_security_config
from app.storage.sqlite import SQLiteStorage
from app.tools.builtin import register_builtin_tools
from app.tools.registry import ToolRegistry
from app.utils.logging import configure_logging

logger = logging.getLogger(__name__)


def _db_path() -> str:
    return os.getenv("AIOS_DB_PATH", "data/orchestrator.db")


def build_system() -> dict[str, Any]:
    configure_logging()
    storage = SQLiteStorage(_db_path())
    policy_engine = PolicyEngine(PolicyConfig())
    tool_registry = ToolRegistry()
    register_builtin_tools(tool_registry)
    agents = build_agents()

    security_config = load_security_config()
    approval_service = ApprovalService(
        storage=storage,
        pqc_signer=PQCSigner(
            private_key=security_config.pqc_private_key,
            public_key=security_config.pqc_public_key,
        ),
        otp_secret=security_config.otp_secret,
        webauthn_key=security_config.webauthn_hmac_key,
        ttl_seconds=security_config.challenge_ttl_seconds,
    )
    orchestrator = OrchestratorEngine(
        OrchestratorContext(
            storage=storage,
            policy_engine=policy_engine,
            tool_registry=tool_registry,
            agents=agents,
        )
    )
    return {
        "storage": storage,
        "policy": policy_engine,
        "tools": tool_registry,
        "agents": agents,
        "approval_service": approval_service,
        "orchestrator": orchestrator,
        "loop_task": None,
    }


@asynccontextmanager
async def lifespan(app: FastAPI):
    state = build_system()
    app.state.system = state
    loop_task = asyncio.create_task(state["orchestrator"].run_loop())
    state["loop_task"] = loop_task
    try:
        yield
    finally:
        state["orchestrator"].stop()
        await asyncio.wait([loop_task], timeout=2)


app = FastAPI(title="AI Orchestration System", default_response_class=ORJSONResponse, lifespan=lifespan)


def get_system() -> dict[str, Any]:
    return app.state.system


def get_orchestrator(system: dict[str, Any] = Depends(get_system)) -> OrchestratorEngine:
    return system["orchestrator"]


def get_storage(system: dict[str, Any] = Depends(get_system)) -> SQLiteStorage:
    return system["storage"]


def get_approval_service(system: dict[str, Any] = Depends(get_system)) -> ApprovalService:
    return system["approval_service"]


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(status="ok", time=utcnow(), actor=ActorType.SYSTEM)


@app.post("/events")
async def create_event(event: EventCreate, orchestrator: OrchestratorEngine = Depends(get_orchestrator)) -> dict[str, Any]:
    record = orchestrator.ingest_event(event)
    return {"event_id": record.event_id, "trace_id": record.trace_id, "status": record.status}


@app.get("/tasks")
async def list_tasks(storage: SQLiteStorage = Depends(get_storage)) -> list[dict[str, Any]]:
    return [task.model_dump(mode="json") for task in storage.list_tasks()]


@app.get("/approvals")
async def list_approvals(status: str | None = None, storage: SQLiteStorage = Depends(get_storage)) -> list[dict[str, Any]]:
    approvals = storage.list_approvals(status=status)
    return [approval.model_dump(mode="json") for approval in approvals]


@app.post("/approvals/{approval_id}/challenge")
async def issue_challenge(
    approval_id: str,
    actor_id: str,
    storage: SQLiteStorage = Depends(get_storage),
    approval_service: ApprovalService = Depends(get_approval_service),
) -> dict[str, Any]:
    approval = storage.get_approval(approval_id)
    if approval is None:
        raise HTTPException(status_code=404, detail="approval_not_found")
    challenge = approval_service.issue_challenge(approval, actor_id=actor_id)
    return challenge.model_dump(mode="json")


@app.post("/approvals/{approval_id}/decide")
async def decide_approval(
    approval_id: str,
    decision: ApprovalDecisionInput,
    storage: SQLiteStorage = Depends(get_storage),
    approval_service: ApprovalService = Depends(get_approval_service),
    orchestrator: OrchestratorEngine = Depends(get_orchestrator),
) -> dict[str, Any]:
    approval = storage.get_approval(approval_id)
    if approval is None:
        raise HTTPException(status_code=404, detail="approval_not_found")
    if approval.status != "pending":
        raise HTTPException(status_code=400, detail="approval_not_pending")
    try:
        artifact = approval_service.validate_decision(approval, decision)
    except ValueError as exc:  # validation errors are business errors
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    approval.status = "approved" if decision.decision == "approve" else "denied"
    approval.reason = decision.reason
    approval.decided_by = decision.actor_id
    approval.decided_at = utcnow()
    storage.update_approval(approval)

    audit_status = "completed" if approval.status == "approved" else "blocked"
    storage.add_audit(
        AuditRecord(
            trace_id=approval.trace_id,
            actor_id=decision.actor_id,
            actor_type=ActorType.CEO,
            permission_level=PermissionLevel.L4_HIGH_RISK,
            action="approval_decision",
            status=audit_status,
            inputs={"approval_id": approval_id, "decision": decision.decision},
            outputs={"artifact_hash": artifact.pqc_signature or artifact.otp_proof_hash},
            evidence_refs=approval.evidence_refs,
        )
    )

    execution_result: dict[str, Any] | None = None
    if approval.status == "approved":
        execution_result = orchestrator.execute_approved_action(approval_id)

    return {
        "approval_id": approval_id,
        "status": approval.status,
        "artifact": artifact.model_dump(mode="json"),
        "execution_result": execution_result,
    }


@app.get("/audit")
async def query_audit(query: AuditQuery = Depends(), storage: SQLiteStorage = Depends(get_storage)) -> list[dict[str, Any]]:
    return storage.query_audit(query.trace_id)
