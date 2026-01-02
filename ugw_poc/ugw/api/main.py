from __future__ import annotations

import os
import uuid
from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse

from ugw.audit.events import record_event
from ugw.audit.log import export_events, get_checkpoints, list_events, verify_log
from ugw.core.authz import evaluate_policy
from ugw.core.config import settings
from ugw.core.keys import get_keystore
from ugw.core.logging import setup_logging
from ugw.core.security import ActorContext, apply_rate_limit, enforce_size_limit, get_actor_context
from ugw.db.database import init_db
from ugw.models.schemas import (
    ArtifactCreate,
    ArtifactUpdate,
    AuditEventFilter,
    EvidenceExportRequest,
    InviteRequest,
    KeyRotationResponse,
    OracleFactRequest,
    RevalidateRequest,
    RoomCreate,
    TrustRegistryUpdate,
    UserCreate,
    VCRequest,
)
from ugw.services import artifacts, identity, oracle, replay, rooms, trust_registry
from ugw.services.cache import TTLCache
from ugw.services.evidence import export_bundle
from ugw.utils.crypto import sha256_json


logger = setup_logging()
app = FastAPI(title=settings.app_name)
registry_cache = TTLCache(ttl_seconds=60)
oracle_cache = TTLCache(ttl_seconds=60)


@app.middleware("http")
async def size_limit_middleware(request: Request, call_next):
    enforce_size_limit(request)
    return await call_next(request)


@app.on_event("startup")
async def startup() -> None:
    init_db()
    os.makedirs(settings.artifact_store, exist_ok=True)
    os.makedirs(settings.evidence_store, exist_ok=True)
    get_keystore().ensure_active_key()


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def check_identity(actor_id: str) -> Dict[str, Any]:
    user = identity.get_user(actor_id)
    if not user:
        return {
            "user": None,
            "registry": None,
            "oracle_facts": [],
            "valid": False,
            "reasons": ["actor_missing"],
        }
    registry_record = registry_cache.get(actor_id)
    if registry_record is None:
        registry_record = trust_registry.get_registry(actor_id)
        registry_cache.set(actor_id, registry_record)
    oracle_facts = oracle_cache.get(actor_id)
    if oracle_facts is None:
        oracle_facts = oracle.list_facts(actor_id)
        oracle_cache.set(actor_id, oracle_facts)
    verified_facts = [fact for fact in oracle_facts if oracle.verify_fact(fact)]
    sanctioned = any(fact["fact_type"] == "sanctioned" for fact in verified_facts)
    valid = True
    reason = []
    if user["pop_status"] == "unverified":
        valid = False
        reason.append("pop_unverified")
    if user["vc_revoked"]:
        valid = False
        reason.append("vc_revoked")
    if user["vc_expiry"]:
        if datetime.fromisoformat(user["vc_expiry"]) < datetime.now(timezone.utc):
            valid = False
            reason.append("vc_expired")
    if registry_record:
        if registry_record["revoked"]:
            valid = False
            reason.append("registry_revoked")
        if registry_record["expires_at"] and datetime.fromisoformat(registry_record["expires_at"]) < datetime.now(timezone.utc):
            valid = False
            reason.append("registry_expired")
    if sanctioned:
        valid = False
        reason.append("sanctioned")
    return {
        "user": user,
        "registry": registry_record,
        "oracle_facts": verified_facts,
        "valid": valid,
        "reasons": reason,
    }


def authorize(request: Request, actor: ActorContext, action: str, resource: Dict[str, Any], room: Dict[str, Any] | None, extra: Dict[str, Any]) -> Dict[str, Any]:
    input_payload = {
        "actor": {"id": actor.actor_id, "role": actor.role},
        "action": action,
        "resource": resource,
        "room": room or {},
        "request": {"path": request.url.path, "method": request.method},
        "context": extra,
    }
    decision = evaluate_policy(input_payload)
    result = decision.get("result", {})
    return {
        "allow": result.get("allow", False),
        "matched_rules": result.get("matched_rules", []),
        "reason": result.get("reason", "no rule matched"),
        "input": input_payload,
    }


def audit_decision(
    actor: ActorContext,
    action: str,
    resource_type: str,
    resource_id: str,
    decision: Dict[str, Any],
    what: Dict[str, Any],
    identity_check: Dict[str, Any],
    final_allow: bool | None = None,
    denial_reason: str | None = None,
) -> Dict[str, Any]:
    allow_value = decision["allow"] if final_allow is None else final_allow
    identity_digest = sha256_json(
        {
            "user": identity_check.get("user"),
            "registry": identity_check.get("registry"),
            "oracle_facts": identity_check.get("oracle_facts"),
        }
    )
    why = {
        "opa": {
            "allow": decision["allow"],
            "matched_rules": decision["matched_rules"],
            "reason": decision["reason"],
            "input_summary": {
                "action": decision["input"]["action"],
                "resource": decision["input"]["resource"],
            },
        },
        "identity": {
            "valid": identity_check["valid"],
            "reasons": identity_check["reasons"],
            "registry": identity_check["registry"],
            "oracle_facts": identity_check["oracle_facts"],
            "digest": identity_digest,
        },
    }
    event = record_event(
        actor_id=actor.actor_id,
        role=actor.role,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        request_id=actor.request_id,
        decision="allow" if allow_value else "deny",
        why=why,
        what=what,
        denial_reason=denial_reason,
    )
    logger.info(
        "audit_event",
        extra={
            "event_id": event["event_id"],
            "actor_id": actor.actor_id,
            "action": action,
            "decision": "allow" if allow_value else "deny",
            "request_id": actor.request_id,
        },
    )
    return event


@app.get("/api/health")
async def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.post("/api/identity/users")
async def create_user(payload: UserCreate, request: Request, actor: ActorContext = Depends(get_actor_context)):
    apply_rate_limit(actor)
    decision = authorize(request, actor, "identity:manage", {"type": "user", "id": payload.id}, None, {})
    identity_check = check_identity(actor.actor_id)
    if not decision["allow"]:
        audit_decision(actor, "identity:manage", "user", payload.id, decision, {}, identity_check, "opa_deny")
        raise HTTPException(status_code=403, detail="Forbidden")
    identity.create_user(payload.id, payload.name, payload.role)
    audit_decision(actor, "identity:manage", "user", payload.id, decision, {"created": True}, identity_check)
    return {"status": "created"}


@app.post("/api/identity/{user_id}/pop")
async def verify_pop(user_id: str, payload: Dict[str, Any], request: Request, actor: ActorContext = Depends(get_actor_context)):
    apply_rate_limit(actor)
    decision = authorize(request, actor, "identity:manage", {"type": "pop", "id": user_id}, None, {})
    identity_check = check_identity(actor.actor_id)
    if not decision["allow"]:
        audit_decision(actor, "identity:manage", "pop", user_id, decision, {}, identity_check, "opa_deny")
        raise HTTPException(status_code=403, detail="Forbidden")
    record = identity.update_pop(user_id, payload.get("method", "stub"), payload.get("proof", {}))
    audit_decision(actor, "identity:manage", "pop", user_id, decision, {"pop": record}, identity_check)
    return record


@app.post("/api/identity/{user_id}/vc/issue")
async def issue_vc(user_id: str, payload: VCRequest, request: Request, actor: ActorContext = Depends(get_actor_context)):
    apply_rate_limit(actor)
    decision = authorize(request, actor, "identity:manage", {"type": "vc", "id": user_id}, None, {})
    identity_check = check_identity(actor.actor_id)
    if not decision["allow"]:
        audit_decision(actor, "identity:manage", "vc", user_id, decision, {}, identity_check, "opa_deny")
        raise HTTPException(status_code=403, detail="Forbidden")
    record = identity.issue_vc(user_id, payload.expires_at)
    audit_decision(actor, "identity:manage", "vc", user_id, decision, {"vc": record}, identity_check)
    return record


@app.post("/api/identity/{user_id}/vc/revoke")
async def revoke_vc(user_id: str, payload: Dict[str, Any], request: Request, actor: ActorContext = Depends(get_actor_context)):
    apply_rate_limit(actor)
    decision = authorize(request, actor, "identity:manage", {"type": "vc", "id": user_id}, None, {})
    identity_check = check_identity(actor.actor_id)
    if not decision["allow"]:
        audit_decision(actor, "identity:manage", "vc", user_id, decision, {}, identity_check, "opa_deny")
        raise HTTPException(status_code=403, detail="Forbidden")
    record = identity.revoke_vc(user_id, payload.get("reason", "unspecified"))
    audit_decision(actor, "identity:manage", "vc", user_id, decision, {"vc": record}, identity_check)
    return record


@app.post("/api/identity/revalidate")
async def revalidate(payload: RevalidateRequest, request: Request, actor: ActorContext = Depends(get_actor_context)):
    apply_rate_limit(actor)
    decision = authorize(request, actor, "identity:manage", {"type": "revalidate", "id": payload.user_id}, None, {})
    identity_check = check_identity(actor.actor_id)
    if not decision["allow"]:
        audit_decision(actor, "identity:manage", "revalidate", payload.user_id, decision, {}, identity_check, "opa_deny")
        raise HTTPException(status_code=403, detail="Forbidden")
    registry_record = trust_registry.get_registry(payload.user_id)
    if registry_record:
        identity.update_vc_status(payload.user_id, registry_record["vc_status"], registry_record["expires_at"], bool(registry_record["revoked"]))
    audit_decision(actor, "identity:manage", "revalidate", payload.user_id, decision, {"registry": registry_record}, identity_check)
    return {"status": "revalidated", "registry": registry_record}


@app.post("/api/registry/update")
async def update_registry(payload: TrustRegistryUpdate, request: Request, actor: ActorContext = Depends(get_actor_context)):
    apply_rate_limit(actor)
    decision = authorize(request, actor, "registry:manage", {"type": "registry", "id": payload.user_id}, None, {})
    identity_check = check_identity(actor.actor_id)
    if not decision["allow"]:
        audit_decision(actor, "registry:manage", "registry", payload.user_id, decision, {}, identity_check, "opa_deny")
        raise HTTPException(status_code=403, detail="Forbidden")
    trust_registry.update_registry(payload.user_id, payload.vc_status, payload.expires_at, payload.revoked)
    registry_cache.set(payload.user_id, trust_registry.get_registry(payload.user_id))
    audit_decision(actor, "registry:manage", "registry", payload.user_id, decision, payload.dict(), identity_check)
    return {"status": "updated"}


@app.post("/api/oracle/fact")
async def ingest_fact(payload: OracleFactRequest, request: Request, actor: ActorContext = Depends(get_actor_context)):
    apply_rate_limit(actor)
    decision = authorize(request, actor, "oracle:manage", {"type": "oracle", "id": payload.subject_id}, None, {})
    identity_check = check_identity(actor.actor_id)
    if not decision["allow"]:
        audit_decision(actor, "oracle:manage", "oracle", payload.subject_id, decision, {}, identity_check, "opa_deny")
        raise HTTPException(status_code=403, detail="Forbidden")
    signed = oracle.store_fact(payload.subject_id, payload.fact_type, payload.payload)
    oracle_cache.set(payload.subject_id, oracle.list_facts(payload.subject_id))
    audit_decision(actor, "oracle:manage", "oracle", payload.subject_id, decision, {"fact": signed}, identity_check)
    return signed


@app.get("/api/oracle/{subject_id}")
async def list_oracle_facts(subject_id: str, request: Request, actor: ActorContext = Depends(get_actor_context)):
    apply_rate_limit(actor)
    decision = authorize(request, actor, "oracle:manage", {"type": "oracle", "id": subject_id}, None, {})
    identity_check = check_identity(actor.actor_id)
    if not decision["allow"]:
        audit_decision(actor, "oracle:manage", "oracle", subject_id, decision, {}, identity_check, "opa_deny")
        raise HTTPException(status_code=403, detail="Forbidden")
    facts = oracle.list_facts(subject_id)
    audit_decision(actor, "oracle:manage", "oracle", subject_id, decision, {"facts": facts}, identity_check)
    return facts


@app.post("/api/rooms")
async def create_room(payload: RoomCreate, request: Request, actor: ActorContext = Depends(get_actor_context)):
    apply_rate_limit(actor)
    identity_check = check_identity(actor.actor_id)
    decision = authorize(request, actor, "room:create", {"type": "room", "id": payload.id}, None, {"identity": identity_check})
    if not decision["allow"] or not identity_check["valid"]:
        audit_decision(
            actor,
            "room:create",
            "room",
            payload.id,
            decision,
            {},
            identity_check,
            final_allow=False,
            denial_reason="identity_or_policy_denied",
        )
        raise HTTPException(status_code=403, detail="Forbidden")
    rooms.create_room(payload.id, payload.name, actor.actor_id, payload.participants)
    audit_decision(actor, "room:create", "room", payload.id, decision, {"room": payload.dict()}, identity_check)
    return {"status": "created"}


@app.post("/api/rooms/{room_id}/invite")
async def invite(room_id: str, payload: InviteRequest, request: Request, actor: ActorContext = Depends(get_actor_context)):
    apply_rate_limit(actor)
    room = rooms.get_room(room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    identity_check = check_identity(actor.actor_id)
    decision = authorize(request, actor, "room:invite", {"type": "room", "id": room_id}, room, {"invitee": payload.invitee_id})
    if not decision["allow"] or not identity_check["valid"]:
        audit_decision(
            actor,
            "room:invite",
            "room",
            room_id,
            decision,
            {},
            identity_check,
            final_allow=False,
            denial_reason="identity_or_policy_denied",
        )
        raise HTTPException(status_code=403, detail="Forbidden")
    invite_id = str(uuid.uuid4())
    rooms.invite(room_id, invite_id, actor.actor_id, payload.invitee_id)
    audit_decision(actor, "room:invite", "room", room_id, decision, {"invite_id": invite_id}, identity_check)
    return {"invite_id": invite_id}


@app.post("/api/invites/{invite_id}/respond")
async def respond_invite(invite_id: str, payload: Dict[str, Any], request: Request, actor: ActorContext = Depends(get_actor_context)):
    apply_rate_limit(actor)
    identity_check = check_identity(actor.actor_id)
    decision = authorize(request, actor, "room:invite", {"type": "invite", "id": invite_id}, None, {"response": payload.get("status")})
    if not decision["allow"] or not identity_check["valid"]:
        audit_decision(
            actor,
            "room:invite",
            "invite",
            invite_id,
            decision,
            {},
            identity_check,
            final_allow=False,
            denial_reason="identity_or_policy_denied",
        )
        raise HTTPException(status_code=403, detail="Forbidden")
    status = payload.get("status")
    if status not in {"accepted", "declined"}:
        raise HTTPException(status_code=400, detail="Invalid status")
    invite_record = rooms.update_invite(invite_id, status)
    audit_decision(actor, "room:invite", "invite", invite_id, decision, {"status": status}, identity_check)
    return invite_record


@app.delete("/api/rooms/{room_id}/participants/{user_id}")
async def remove_participant(room_id: str, user_id: str, request: Request, actor: ActorContext = Depends(get_actor_context)):
    apply_rate_limit(actor)
    room = rooms.get_room(room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    identity_check = check_identity(actor.actor_id)
    decision = authorize(request, actor, "room:remove", {"type": "room", "id": room_id}, room, {"target": user_id})
    if not decision["allow"] or not identity_check["valid"]:
        audit_decision(
            actor,
            "room:remove",
            "room",
            room_id,
            decision,
            {},
            identity_check,
            final_allow=False,
            denial_reason="identity_or_policy_denied",
        )
        raise HTTPException(status_code=403, detail="Forbidden")
    rooms.remove_participant(room_id, user_id)
    audit_decision(actor, "room:remove", "room", room_id, decision, {"removed": user_id}, identity_check)
    return {"status": "removed"}


@app.post("/api/rooms/{room_id}/artifacts")
async def add_artifact(room_id: str, payload: ArtifactCreate, request: Request, actor: ActorContext = Depends(get_actor_context)):
    apply_rate_limit(actor)
    room = rooms.get_room(room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    identity_check = check_identity(actor.actor_id)
    decision = authorize(
        request,
        actor,
        "artifact:create",
        {"type": "artifact", "id": payload.artifact_id, "classification": payload.classification},
        room,
        {},
    )
    if not decision["allow"] or not identity_check["valid"]:
        audit_decision(
            actor,
            "artifact:create",
            "artifact",
            payload.artifact_id,
            decision,
            {},
            identity_check,
            final_allow=False,
            denial_reason="identity_or_policy_denied",
        )
        raise HTTPException(status_code=403, detail="Forbidden")
    record = artifacts.create_artifact(room_id, payload.artifact_id, payload.name, payload.classification, payload.content, actor.actor_id)
    audit_decision(
        actor,
        "artifact:create",
        "artifact",
        payload.artifact_id,
        decision,
        {"digest": record["digest"], "room_id": room_id},
        identity_check,
    )
    return record


@app.put("/api/artifacts/{artifact_id}")
async def update_artifact(artifact_id: str, payload: ArtifactUpdate, request: Request, actor: ActorContext = Depends(get_actor_context)):
    apply_rate_limit(actor)
    identity_check = check_identity(actor.actor_id)
    decision = authorize(
        request,
        actor,
        "artifact:update",
        {"type": "artifact", "id": artifact_id, "classification": payload.classification},
        None,
        {},
    )
    if not decision["allow"] or not identity_check["valid"]:
        audit_decision(
            actor,
            "artifact:update",
            "artifact",
            artifact_id,
            decision,
            {},
            identity_check,
            final_allow=False,
            denial_reason="identity_or_policy_denied",
        )
        raise HTTPException(status_code=403, detail="Forbidden")
    record = artifacts.update_artifact(artifact_id, payload.content, actor.actor_id, payload.classification)
    audit_decision(actor, "artifact:update", "artifact", artifact_id, decision, {"digest": record["digest"]}, identity_check)
    return record


@app.get("/api/artifacts/{artifact_id}/history")
async def artifact_history(artifact_id: str, request: Request, actor: ActorContext = Depends(get_actor_context)):
    apply_rate_limit(actor)
    identity_check = check_identity(actor.actor_id)
    decision = authorize(
        request,
        actor,
        "artifact:history",
        {"type": "artifact", "id": artifact_id},
        None,
        {},
    )
    if not decision["allow"]:
        audit_decision(actor, "artifact:history", "artifact", artifact_id, decision, {}, identity_check, "opa_deny")
        raise HTTPException(status_code=403, detail="Forbidden")
    history = artifacts.list_versions(artifact_id)
    audit_decision(actor, "artifact:history", "artifact", artifact_id, decision, {"versions": len(history)}, identity_check)
    return history


@app.post("/api/rooms/{room_id}/export")
async def export_evidence(room_id: str, payload: EvidenceExportRequest, request: Request, actor: ActorContext = Depends(get_actor_context)):
    apply_rate_limit(actor)
    room = rooms.get_room(room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    identity_check = check_identity(actor.actor_id)
    decision = authorize(
        request,
        actor,
        "room:export",
        {"type": "room", "id": room_id, "include_confidential": payload.include_confidential},
        room,
        {},
    )
    if not decision["allow"] or not identity_check["valid"]:
        audit_decision(
            actor,
            "room:export",
            "room",
            room_id,
            decision,
            {},
            identity_check,
            final_allow=False,
            denial_reason="identity_or_policy_denied",
        )
        raise HTTPException(status_code=403, detail="Forbidden")
    bundle = export_bundle(room_id, payload.include_confidential)
    audit_decision(actor, "room:export", "room", room_id, decision, {"bundle": bundle}, identity_check)
    return bundle


@app.post("/api/rooms/{room_id}/close")
async def close_room(room_id: str, request: Request, actor: ActorContext = Depends(get_actor_context)):
    apply_rate_limit(actor)
    room = rooms.get_room(room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    identity_check = check_identity(actor.actor_id)
    decision = authorize(request, actor, "room:close", {"type": "room", "id": room_id}, room, {})
    if not decision["allow"] or not identity_check["valid"]:
        audit_decision(
            actor,
            "room:close",
            "room",
            room_id,
            decision,
            {},
            identity_check,
            final_allow=False,
            denial_reason="identity_or_policy_denied",
        )
        raise HTTPException(status_code=403, detail="Forbidden")
    rooms.close_room(room_id)
    audit_decision(actor, "room:close", "room", room_id, decision, {"status": "closed"}, identity_check)
    return {"status": "closed"}


@app.post("/api/rooms/{room_id}/legal-hold")
async def legal_hold(room_id: str, payload: Dict[str, Any], request: Request, actor: ActorContext = Depends(get_actor_context)):
    apply_rate_limit(actor)
    room = rooms.get_room(room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    identity_check = check_identity(actor.actor_id)
    decision = authorize(request, actor, "legal_hold:set", {"type": "room", "id": room_id}, room, payload)
    if not decision["allow"] or not identity_check["valid"]:
        audit_decision(
            actor,
            "legal_hold:set",
            "room",
            room_id,
            decision,
            {},
            identity_check,
            final_allow=False,
            denial_reason="identity_or_policy_denied",
        )
        raise HTTPException(status_code=403, detail="Forbidden")
    enabled = bool(payload.get("enabled", True))
    rooms.set_legal_hold(room_id, enabled)
    audit_decision(actor, "legal_hold:set", "room", room_id, decision, {"enabled": enabled}, identity_check)
    return {"status": "updated", "enabled": enabled}


@app.get("/api/audit/events")
async def audit_events(request: Request, filter: AuditEventFilter = Depends(), actor: ActorContext = Depends(get_actor_context)):
    apply_rate_limit(actor)
    decision = authorize(request, actor, "audit:view", {"type": "audit", "id": "events"}, None, {})
    identity_check = check_identity(actor.actor_id)
    if not decision["allow"]:
        audit_decision(actor, "audit:view", "audit", "events", decision, {}, identity_check, "opa_deny")
        raise HTTPException(status_code=403, detail="Forbidden")
    events = list_events(filter.dict())
    audit_decision(actor, "audit:view", "audit", "events", decision, {"count": len(events)}, identity_check)
    return events


@app.post("/api/audit/verify")
async def verify_audit(request: Request, actor: ActorContext = Depends(get_actor_context)):
    apply_rate_limit(actor)
    decision = authorize(request, actor, "audit:view", {"type": "audit", "id": "verify"}, None, {})
    identity_check = check_identity(actor.actor_id)
    if not decision["allow"]:
        audit_decision(actor, "audit:view", "audit", "verify", decision, {}, identity_check, "opa_deny")
        raise HTTPException(status_code=403, detail="Forbidden")
    report = verify_log()
    audit_decision(actor, "audit:view", "audit", "verify", decision, report, identity_check)
    return report


@app.post("/api/audit/rotate-key", response_model=KeyRotationResponse)
async def rotate_key(request: Request, actor: ActorContext = Depends(get_actor_context)):
    apply_rate_limit(actor)
    decision = authorize(request, actor, "keys:rotate", {"type": "keys", "id": "audit"}, None, {})
    identity_check = check_identity(actor.actor_id)
    if not decision["allow"]:
        audit_decision(actor, "keys:rotate", "keys", "audit", decision, {}, identity_check, "opa_deny")
        raise HTTPException(status_code=403, detail="Forbidden")
    record = get_keystore().rotate_key()
    audit_decision(actor, "keys:rotate", "keys", "audit", decision, {"key_id": record.key_id}, identity_check)
    return KeyRotationResponse(key_id=record.key_id, created_at=record.created_at)


@app.post("/api/replay")
async def replay_state(request: Request, actor: ActorContext = Depends(get_actor_context)):
    apply_rate_limit(actor)
    decision = authorize(request, actor, "audit:view", {"type": "replay", "id": "state"}, None, {})
    identity_check = check_identity(actor.actor_id)
    if not decision["allow"]:
        audit_decision(actor, "audit:view", "replay", "state", decision, {}, identity_check, "opa_deny")
        raise HTTPException(status_code=403, detail="Forbidden")
    result = replay.replay_events(export_events())
    audit_decision(actor, "audit:view", "replay", "state", decision, result, identity_check)
    return result


@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    return JSONResponse(status_code=400, content={"detail": str(exc)})
