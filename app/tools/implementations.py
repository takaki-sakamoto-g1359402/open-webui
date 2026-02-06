from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from typing import Any

from app.schemas.enums import PermissionLevel
from app.schemas.models import EvidenceRef, ToolCallContext, ToolResult
from app.tools.registry import ToolDefinition, ToolRegistry


@dataclass(slots=True)
class ToolState:
    """In-memory reversible state used by rollback handlers in tests and demos."""

    created_tickets: list[dict[str, Any]] = field(default_factory=list)
    drafted_messages: list[dict[str, Any]] = field(default_factory=list)
    invoices: list[dict[str, Any]] = field(default_factory=list)
    crm_updates: list[dict[str, Any]] = field(default_factory=list)
    rollbacks: list[dict[str, Any]] = field(default_factory=list)


async def create_ticket(ctx: ToolCallContext, payload: dict[str, Any], state: ToolState) -> ToolResult:
    await asyncio.sleep(0)
    ticket = {
        "ticket_id": f"T-{len(state.created_tickets)+1:04d}",
        "summary": payload.get("summary", "unspecified"),
        "priority": payload.get("priority", "normal"),
    }
    state.created_tickets.append(ticket)
    evidence = [EvidenceRef(source="ticketing", detail=ticket["ticket_id"])]
    return ToolResult(success=True, output=ticket, evidence=evidence)


async def rollback_ticket(ctx: ToolCallContext, payload: dict[str, Any], result: dict[str, Any], state: ToolState) -> None:
    await asyncio.sleep(0)
    state.rollbacks.append({"tool": "create_ticket", "ticket_id": result.get("ticket_id")})
    state.created_tickets = [t for t in state.created_tickets if t.get("ticket_id") != result.get("ticket_id")]


async def draft_message(ctx: ToolCallContext, payload: dict[str, Any], state: ToolState) -> ToolResult:
    await asyncio.sleep(0)
    draft = {
        "channel": payload.get("channel", "email"),
        "subject": payload.get("subject", "Follow up"),
        "body": payload.get("body", ""),
    }
    state.drafted_messages.append(draft)
    evidence = [EvidenceRef(source="comms", detail=draft["subject"])]
    return ToolResult(success=True, output=draft, evidence=evidence)


async def send_invoice(ctx: ToolCallContext, payload: dict[str, Any], state: ToolState) -> ToolResult:
    await asyncio.sleep(0)
    invoice = {
        "invoice_id": f"INV-{len(state.invoices)+1:05d}",
        "amount": float(payload.get("amount", 0)),
        "customer": payload.get("customer", "unknown"),
        "status": "drafted",
    }
    state.invoices.append(invoice)
    evidence = [EvidenceRef(source="billing", detail=invoice["invoice_id"])]
    post_check_failed = bool(payload.get("force_post_check_fail"))
    return ToolResult(
        success=not post_check_failed,
        output={**invoice, "post_check_failed": post_check_failed},
        evidence=evidence,
        post_check_failed=post_check_failed,
        anomalies=["post_check_failure"] if post_check_failed else [],
    )


async def rollback_invoice(ctx: ToolCallContext, payload: dict[str, Any], result: dict[str, Any], state: ToolState) -> None:
    await asyncio.sleep(0)
    invoice_id = result.get("invoice_id")
    state.rollbacks.append({"tool": "send_invoice", "invoice_id": invoice_id})
    state.invoices = [inv for inv in state.invoices if inv.get("invoice_id") != invoice_id]


async def update_crm(ctx: ToolCallContext, payload: dict[str, Any], state: ToolState) -> ToolResult:
    await asyncio.sleep(0)
    update = {
        "lead_id": payload.get("lead_id", "lead-unknown"),
        "status": payload.get("status", "contacted"),
        "notes": payload.get("notes", ""),
    }
    state.crm_updates.append(update)
    evidence = [EvidenceRef(source="crm", detail=update["lead_id"])]
    return ToolResult(success=True, output=update, evidence=evidence)


async def dangerous_delete_records(ctx: ToolCallContext, payload: dict[str, Any], state: ToolState) -> ToolResult:
    await asyncio.sleep(0)
    return ToolResult(
        success=False,
        output={"message": "destructive action blocked", "target": payload.get("target")},
        evidence=[EvidenceRef(source="security", detail="blocked_dangerous_delete")],
        anomalies=["destructive_request"],
        policy_notes=["requires_l4"],
    )



def build_registry(state: ToolState | None = None) -> tuple[ToolRegistry, ToolState]:
    state = state or ToolState()
    registry = ToolRegistry()

    registry.register(
        ToolDefinition(
            name="create_ticket",
            description="Create a reversible customer support ticket",
            required_level=PermissionLevel.L2_EXECUTE_LOW_RISK,
            handler=lambda ctx, payload: create_ticket(ctx, payload, state),
            rollback_handler=lambda ctx, payload, result: rollback_ticket(ctx, payload, result, state),
            tags={"support", "reversible"},
        )
    )

    registry.register(
        ToolDefinition(
            name="draft_message",
            description="Draft an outbound message without sending",
            required_level=PermissionLevel.L1_PROPOSE,
            handler=lambda ctx, payload: draft_message(ctx, payload, state),
            tags={"comms"},
        )
    )

    registry.register(
        ToolDefinition(
            name="send_invoice",
            description="Draft and send an invoice with rollback support",
            required_level=PermissionLevel.L3_EXECUTE_CONDITIONAL,
            handler=lambda ctx, payload: send_invoice(ctx, payload, state),
            rollback_handler=lambda ctx, payload, result: rollback_invoice(ctx, payload, result, state),
            tags={"finance", "conditional"},
        )
    )

    registry.register(
        ToolDefinition(
            name="update_crm",
            description="Update CRM records for leads",
            required_level=PermissionLevel.L2_EXECUTE_LOW_RISK,
            handler=lambda ctx, payload: update_crm(ctx, payload, state),
            tags={"sales"},
        )
    )

    registry.register(
        ToolDefinition(
            name="dangerous_delete_records",
            description="Destructive action that should never run autonomously",
            required_level=PermissionLevel.L4_HIGH_RISK,
            handler=lambda ctx, payload: dangerous_delete_records(ctx, payload, state),
            tags={"dangerous", "l4"},
        )
    )

    return registry, state
