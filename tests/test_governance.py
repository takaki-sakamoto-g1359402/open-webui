from __future__ import annotations

import asyncio
import json
from typing import Any

import pytest

from app.schemas.common import ApprovalSecurityLevel
from app.schemas.domain import ApprovalDecisionInput, EventCreate
from app.security.otp import generate_totp
from app.security.webauthn import make_webauthn_proof
from tests.helpers import build_test_system


async def _run_once(orchestrator: Any) -> None:
    await orchestrator.run_once()


def test_policy_denies_l4_without_approval(tmp_path) -> None:
    system = build_test_system(tmp_path)
    orchestrator = system["orchestrator"]
    event = orchestrator.ingest_event(
        EventCreate(event_type="money_movement", payload={"amount": 10000, "recipient": "ceo@example.com"})
    )
    asyncio.run(_run_once(orchestrator))

    approvals = system["storage"].list_approvals(status="pending")
    assert approvals, "L4 action should create a pending approval"
    assert approvals[0].trace_id == event.trace_id


def test_audit_log_masks_pii(tmp_path) -> None:
    system = build_test_system(tmp_path)
    orchestrator = system["orchestrator"]
    payload = {"lead": "Alicia", "recipient": "alicia@personalmail.com", "message": "Contact alicia@personalmail.com"}
    event = orchestrator.ingest_event(EventCreate(event_type="sales_lead", payload=payload))
    asyncio.run(_run_once(orchestrator))

    audit_rows = system["storage"].query_audit(event.trace_id)
    assert audit_rows, "audit rows should exist"
    serialized = json.dumps(audit_rows)
    assert "alicia@personalmail.com" not in serialized
    stored_event = system["storage"].get_event(event.event_id)
    assert stored_event is not None
    assert stored_event.payload.get("recipient") == "***"


def test_kill_switch_conflicting_evidence(tmp_path) -> None:
    system = build_test_system(tmp_path)
    orchestrator = system["orchestrator"]
    event = orchestrator.ingest_event(
        EventCreate(event_type="invoice_request", payload={"amount": 100, "conflicting_evidence": True})
    )
    asyncio.run(_run_once(orchestrator))

    task = system["storage"].get_task_by_trace(event.trace_id)
    assert task is not None
    assert task.status == "held"

    audit_rows = system["storage"].query_audit(event.trace_id)
    assert any(row["action"] == "kill_switch_triggered" for row in audit_rows)


def test_approval_queue_workflow_and_execution(tmp_path) -> None:
    system = build_test_system(tmp_path)
    orchestrator = system["orchestrator"]
    storage = system["storage"]
    approval_service = system["approval_service"]

    event = orchestrator.ingest_event(
        EventCreate(event_type="money_movement", payload={"amount": 2500, "recipient": "ceo@example.com"})
    )
    asyncio.run(_run_once(orchestrator))

    approval = storage.list_approvals(status="pending")[0]
    approval.required_asl = ApprovalSecurityLevel.ASL3_PQC_ARTIFACT
    storage.update_approval(approval)

    challenge = approval_service.issue_challenge(approval, actor_id="ceo")
    webauthn_proof = make_webauthn_proof(
        actor_id="ceo",
        challenge_id=challenge.challenge_id,
        nonce=challenge.nonce,
        shared_key=approval_service.webauthn_key,
    )
    otp_code = generate_totp(approval_service.otp_secret)

    decision = ApprovalDecisionInput(
        actor_id="ceo",
        decision="approve",
        reason="approved",
        webauthn_proof=webauthn_proof,
        otp_code=otp_code,
        challenge_id=challenge.challenge_id,
        challenge_nonce=challenge.nonce,
    )
    artifact = approval_service.validate_decision(approval, decision)

    approval.status = "approved"
    approval.reason = "approved"
    approval.decided_by = "ceo"
    approval.decided_at = artifact.timestamp
    storage.update_approval(approval)

    result = orchestrator.execute_approved_action(approval.approval_id)
    assert result["status"] == "approval_required"
    task = storage.get_task_by_trace(event.trace_id)
    assert task is not None and task.status == "completed"


def test_l3_post_check_failure_invokes_rollback(tmp_path) -> None:
    system = build_test_system(tmp_path)
    orchestrator = system["orchestrator"]

    event = orchestrator.ingest_event(
        EventCreate(
            event_type="external_outreach",
            payload={
                "lead": "Risky",
                "recipient": "ops@example.com",
                "send_external": True,
                "sentiment_score": -0.9,
                "message": "This is a risky outbound.",
            },
        )
    )
    asyncio.run(_run_once(orchestrator))

    task = system["storage"].get_task_by_trace(event.trace_id)
    assert task is not None
    assert task.status == "rolled_back"
    assert task.metadata.get("reason") == "post_check_negative_sentiment"
