from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from app.schemas.common import PermissionLevel
from app.tools.registry import ToolRegistry, ToolSpec
from app.utils.redaction import hash_payload


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def create_internal_ticket(payload: dict[str, Any]) -> dict[str, Any]:
    digest = hash_payload(payload)[:8]
    return {
        "ticket_id": f"TICK-{digest}",
        "status": "created",
        "created_at": _now_iso(),
        "summary": payload.get("summary", "internal task"),
        "details_ref": payload.get("details_ref", "doc://internal-ticket"),
    }


def update_internal_crm(payload: dict[str, Any]) -> dict[str, Any]:
    return {
        "record_id": payload.get("record_id", "crm-unknown"),
        "status": "updated",
        "updated_at": _now_iso(),
        "fields_updated": sorted(payload.get("fields", {}).keys()),
    }


def send_external_message(payload: dict[str, Any]) -> dict[str, Any]:
    digest = hash_payload(payload)[:8]
    return {
        "message_id": f"MSG-{digest}",
        "sent_at": _now_iso(),
        "recipient": payload.get("recipient"),
        "channel": payload.get("channel", "email"),
        "body_ref": payload.get("body_ref", "doc://message"),
        "delivery": "queued",
    }


def rollback_external_message(payload: dict[str, Any], result: dict[str, Any]) -> dict[str, Any]:
    return {
        "message_id": result.get("message_id"),
        "rolled_back_at": _now_iso(),
        "action": "send_correction",
        "correction_ref": payload.get("correction_ref", "doc://correction"),
    }


def external_post_check(payload: dict[str, Any], result: dict[str, Any]) -> tuple[bool, str | None]:
    sentiment_score = payload.get("sentiment_score", 0.0)
    if isinstance(sentiment_score, (int, float)) and sentiment_score < -0.4:
        return False, "post_check_negative_sentiment"
    return True, None


def request_money_movement(payload: dict[str, Any]) -> dict[str, Any]:
    digest = hash_payload(payload)[:8]
    return {
        "request_id": f"PAY-{digest}",
        "requested_at": _now_iso(),
        "amount": payload.get("amount"),
        "currency": payload.get("currency", "USD"),
        "status": "approval_required",
    }


def register_builtin_tools(registry: ToolRegistry) -> None:
    registry.register(
        ToolSpec(
            name="create_internal_ticket",
            permission_level=PermissionLevel.L2_INTERNAL_EXECUTE,
            external_impact=False,
            handler=create_internal_ticket,
            description="Create reversible internal tickets.",
            tags={"internal", "ticket"},
        )
    )
    registry.register(
        ToolSpec(
            name="update_internal_crm",
            permission_level=PermissionLevel.L2_INTERNAL_EXECUTE,
            external_impact=False,
            handler=update_internal_crm,
            description="Update internal CRM fields.",
            tags={"internal", "crm"},
        )
    )
    registry.register(
        ToolSpec(
            name="send_external_message",
            permission_level=PermissionLevel.L3_CONDITIONAL_EXECUTE,
            external_impact=True,
            handler=send_external_message,
            rollback=rollback_external_message,
            post_check=external_post_check,
            description="Send a controlled outbound message with rollback.",
            tags={"external", "comms"},
        )
    )
    registry.register(
        ToolSpec(
            name="request_money_movement",
            permission_level=PermissionLevel.L4_HIGH_RISK,
            external_impact=True,
            handler=request_money_movement,
            description="High-risk money movement request.",
            tags={"finance", "high_risk"},
        )
    )
