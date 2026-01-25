from __future__ import annotations

import argparse
import asyncio
import os
from typing import Any

import uvicorn

from app.main import build_system
from app.schemas.domain import ApprovalDecisionInput, EventCreate
from app.security.otp import generate_totp
from app.security.webauthn import make_webauthn_proof


def _system() -> dict[str, Any]:
    return build_system()


def cmd_start(_: argparse.Namespace) -> None:
    uvicorn.run("app.main:app", host=os.getenv("AIOS_HOST", "0.0.0.0"), port=int(os.getenv("AIOS_PORT", "8081")))


def cmd_inject(args: argparse.Namespace) -> None:
    system = _system()
    orchestrator = system["orchestrator"]
    event = EventCreate(event_type=args.event_type, payload=args.payload)
    record = orchestrator.ingest_event(event)

    async def run_once() -> None:
        await orchestrator.run_once()

    asyncio.run(run_once())
    print({"event_id": record.event_id, "trace_id": record.trace_id})


def cmd_approve(args: argparse.Namespace) -> None:
    system = _system()
    storage = system["storage"]
    approvals = storage.list_approvals(status="pending")
    if not approvals:
        raise SystemExit("No pending approvals found.")
    approval = approvals[0] if args.approval_id is None else storage.get_approval(args.approval_id)
    if approval is None:
        raise SystemExit("Approval not found.")

    approval_service = system["approval_service"]
    challenge = approval_service.issue_challenge(approval, actor_id=args.actor_id)
    security_config = system["approval_service"].pqc_signer

    webauthn_proof = make_webauthn_proof(
        actor_id=args.actor_id,
        challenge_id=challenge.challenge_id,
        nonce=challenge.nonce,
        shared_key=system["approval_service"].webauthn_key,
    )
    otp_code = generate_totp(system["approval_service"].otp_secret)
    signature_payload = {
        "approval_id": approval.approval_id,
        "trace_id": approval.trace_id,
        "actor_id": args.actor_id,
        "challenge_id": challenge.challenge_id,
        "nonce": challenge.nonce,
        "decision": "approve",
        "timestamp": challenge.created_at.isoformat(),
    }
    pqc_signature = security_config.sign(signature_payload).signature

    decision = ApprovalDecisionInput(
        actor_id=args.actor_id,
        decision="approve",
        reason=args.reason,
        webauthn_proof=webauthn_proof,
        otp_code=otp_code,
        pqc_signature=pqc_signature,
        challenge_id=challenge.challenge_id,
        challenge_nonce=challenge.nonce,
    )

    artifact = approval_service.validate_decision(approval, decision)
    approval.status = "approved"
    approval.reason = args.reason
    approval.decided_by = args.actor_id
    approval.decided_at = artifact.timestamp
    storage.update_approval(approval)
    result = system["orchestrator"].execute_approved_action(approval.approval_id)
    print({"approval_id": approval.approval_id, "artifact": artifact.model_dump(mode="json"), "result": result})


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="AI Orchestration System CLI")
    sub = parser.add_subparsers(dest="command", required=True)

    start = sub.add_parser("start", help="Start the API server")
    start.set_defaults(func=cmd_start)

    inject = sub.add_parser("inject", help="Inject a sample event and run one iteration")
    inject.add_argument("event_type", help="Event type to inject")
    inject.add_argument("--payload", type=lambda raw: __import__("json").loads(raw), default="{}")
    inject.set_defaults(func=cmd_inject)

    approve = sub.add_parser("approve", help="Approve the first pending approval with ASL-3 proofs")
    approve.add_argument("--approval-id", dest="approval_id")
    approve.add_argument("--actor-id", default="ceo")
    approve.add_argument("--reason", default="approved via CLI")
    approve.set_defaults(func=cmd_approve)

    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
