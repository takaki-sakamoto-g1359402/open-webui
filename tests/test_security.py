from __future__ import annotations

from typing import Any

import pytest

from app.schemas.common import ApprovalSecurityLevel
from app.schemas.domain import ApprovalDecisionInput, ApprovalRequest, EvidenceRef
from app.security.otp import generate_totp
from app.security.webauthn import make_webauthn_proof
from tests.helpers import build_test_system


def _make_approval(system: dict[str, Any], required_asl: ApprovalSecurityLevel) -> ApprovalRequest:
    approval = ApprovalRequest(
        trace_id="trace-security",
        requested_action={"tool_name": "request_money_movement"},
        required_asl=required_asl,
        evidence_refs=[EvidenceRef(ref_id="doc-1", uri="doc://1")],
    )
    system["storage"].create_approval(approval)
    return approval


def test_asl2_requires_webauthn_and_otp(tmp_path) -> None:
    system = build_test_system(tmp_path)
    approval_service = system["approval_service"]
    approval = _make_approval(system, ApprovalSecurityLevel.ASL2_PASSKEY_OTP)
    challenge = approval_service.issue_challenge(approval, actor_id="ceo")

    webauthn_proof = make_webauthn_proof(
        actor_id="ceo",
        challenge_id=challenge.challenge_id,
        nonce=challenge.nonce,
        shared_key=approval_service.webauthn_key,
    )

    decision_missing_otp = ApprovalDecisionInput(
        actor_id="ceo",
        decision="approve",
        reason="missing otp",
        webauthn_proof=webauthn_proof,
        challenge_id=challenge.challenge_id,
        challenge_nonce=challenge.nonce,
    )

    with pytest.raises(ValueError, match="otp_required"):
        approval_service.validate_decision(approval, decision_missing_otp)


def test_asl3_artifact_includes_pqc_signature_and_verifies(tmp_path) -> None:
    system = build_test_system(tmp_path)
    approval_service = system["approval_service"]
    approval = _make_approval(system, ApprovalSecurityLevel.ASL3_PQC_ARTIFACT)
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
        reason="all factors present",
        webauthn_proof=webauthn_proof,
        otp_code=otp_code,
        challenge_id=challenge.challenge_id,
        challenge_nonce=challenge.nonce,
    )
    artifact = approval_service.validate_decision(approval, decision)

    assert artifact.pqc_signature, "ASL-3 must include a PQC signature"

    payload = {
        "approval_id": artifact.approval_id,
        "trace_id": artifact.trace_id,
        "actor_id": artifact.actor_id,
        "challenge_id": artifact.server_challenge_id,
        "nonce": artifact.server_challenge_nonce,
        "decision": artifact.decision,
        "timestamp": artifact.timestamp.isoformat(),
    }
    assert approval_service.pqc_signer.verify(payload, artifact.pqc_signature)
