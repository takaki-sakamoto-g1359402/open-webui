from __future__ import annotations

import secrets
from datetime import timedelta
from typing import Any

from app.schemas.common import ApprovalSecurityLevel, PermissionLevel, utcnow
from app.schemas.domain import ApprovalArtifact, ApprovalDecisionInput, ApprovalRequest, ChallengeRecord
from app.security.otp import verify_totp
from app.security.pqc import PQCSigner
from app.security.webauthn import verify_webauthn_proof
from app.storage.sqlite import SQLiteStorage
from app.utils.redaction import hash_payload


class ApprovalService:
    def __init__(self, storage: SQLiteStorage, pqc_signer: PQCSigner, otp_secret: str, webauthn_key: str, ttl_seconds: int) -> None:
        self.storage = storage
        self.pqc_signer = pqc_signer
        self.otp_secret = otp_secret
        self.webauthn_key = webauthn_key
        self.ttl_seconds = ttl_seconds

    def issue_challenge(self, approval: ApprovalRequest, actor_id: str) -> ChallengeRecord:
        nonce = secrets.token_hex(16)
        now = utcnow()
        challenge = ChallengeRecord(
            trace_id=approval.trace_id,
            approval_id=approval.approval_id,
            actor_id=actor_id,
            nonce=nonce,
            expires_at=now + timedelta(seconds=self.ttl_seconds),
        )
        self.storage.create_challenge(challenge)
        return challenge

    def validate_decision(self, approval: ApprovalRequest, decision: ApprovalDecisionInput) -> ApprovalArtifact:
        required_asl = ApprovalSecurityLevel(approval.required_asl)
        challenge = self.storage.get_challenge(decision.challenge_id)
        if challenge is None:
            raise ValueError("invalid_challenge")
        if challenge.used_at is not None:
            raise ValueError("challenge_already_used")
        if challenge.expires_at < utcnow():
            raise ValueError("challenge_expired")
        if challenge.nonce != decision.challenge_nonce:
            raise ValueError("challenge_nonce_mismatch")
        if challenge.actor_id != decision.actor_id:
            raise ValueError("challenge_actor_mismatch")

        webauthn_proof = decision.webauthn_proof or {}
        webauthn_valid = verify_webauthn_proof(
            proof=webauthn_proof,
            actor_id=decision.actor_id,
            challenge_id=challenge.challenge_id,
            nonce=challenge.nonce,
            shared_key=self.webauthn_key,
        )
        if required_asl >= ApprovalSecurityLevel.ASL1_PASSKEY and not webauthn_valid:
            raise ValueError("webauthn_required")

        otp_hash: str | None = None
        if required_asl >= ApprovalSecurityLevel.ASL2_PASSKEY_OTP:
            if not decision.otp_code:
                raise ValueError("otp_required")
            otp_ok, otp_hash = verify_totp(decision.otp_code, self.otp_secret)
            if not otp_ok:
                raise ValueError("otp_invalid")

        artifact = ApprovalArtifact(
            approval_id=approval.approval_id,
            trace_id=approval.trace_id,
            actor_id=decision.actor_id,
            requested_action=approval.requested_action,
            risk_level=PermissionLevel(approval.risk_level),
            evidence_refs=approval.evidence_refs,
            decision=decision.decision,
            reason=decision.reason,
            server_challenge_id=challenge.challenge_id,
            server_challenge_nonce=challenge.nonce,
            webauthn_signature_proof={
                "verified": webauthn_valid,
                "method": webauthn_proof.get("method"),
                "signature_hash": hash_payload({"sig": webauthn_proof.get("signature", "")[:12]}),
            },
            otp_proof_hash=otp_hash,
        )

        if required_asl >= ApprovalSecurityLevel.ASL3_PQC_ARTIFACT:
            signature_payload = {
                "approval_id": artifact.approval_id,
                "trace_id": artifact.trace_id,
                "actor_id": artifact.actor_id,
                "challenge_id": artifact.server_challenge_id,
                "nonce": artifact.server_challenge_nonce,
                "decision": artifact.decision,
                "timestamp": artifact.timestamp.isoformat(),
            }
            pqc_signature = decision.pqc_signature
            if not pqc_signature:
                pqc_signature = self.pqc_signer.sign(signature_payload).signature
            if not self.pqc_signer.verify(signature_payload, pqc_signature):
                raise ValueError("pqc_signature_invalid")
            artifact.pqc_signature = pqc_signature
            artifact.pqc_algorithm = self.pqc_signer.algorithm

        challenge.used_at = utcnow()
        self.storage.mark_challenge_used(challenge)
        self.storage.store_artifact(artifact, artifact.pqc_algorithm)
        return artifact
