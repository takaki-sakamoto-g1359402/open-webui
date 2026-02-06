from __future__ import annotations

import asyncio
from uuid import UUID

import pytest

from app.orchestrator.bootstrap import build_container
from app.policy.engine import PolicyEngine
from app.schemas.enums import ApprovalStatus, PermissionLevel, TaskStatus
from app.schemas.models import EventCreate
from app.utils.config import AppConfig, DatabaseConfig, GovernanceConfig, OrchestratorConfig


@pytest.fixture()
def test_config(tmp_path) -> AppConfig:
    return AppConfig(
        governance=GovernanceConfig(
            invoice_amount_threshold=1_000,
            anomaly_threshold=0.9,
            margin_floor=0.2,
            sentiment_escalation_threshold=0.75,
        ),
        orchestrator=OrchestratorConfig(poll_interval_seconds=0.01, max_steps_per_event=6),
        database=DatabaseConfig(path=tmp_path / "orchestrator-test.db"),
    )


@pytest.fixture()
def container(test_config: AppConfig):
    return build_container(test_config)


def run(coro):
    return asyncio.run(coro)


def test_policy_denies_l4_without_approval(test_config: AppConfig) -> None:
    engine = PolicyEngine(test_config.governance)
    decision = engine.evaluate_tool_call(
        tool_name="dangerous_delete_records",
        requested_level=PermissionLevel.L4_HIGH_RISK,
        payload={"target": "prod"},
        tool_required_level=PermissionLevel.L4_HIGH_RISK,
        agent_allowed=True,
    )
    assert decision.allowed is False
    assert decision.requires_approval is True
    assert "l4_requires_ceo_approval" in decision.reasons


def test_audit_log_created_for_every_tool_call(container) -> None:
    event = container.events.create(
        EventCreate(type="sales_lead", payload={"lead_id": "lead-123", "notes": "Interested in automation"})
    )
    run(container.orchestrator.process_pending_events())

    tasks = container.tasks.list()
    audit_entries = container.audit.list_by_trace(event.trace_id)

    assert len(tasks) == 2
    assert len(audit_entries) == 2
    assert all(entry.trace_id == event.trace_id for entry in audit_entries)


def test_kill_switch_triggers_on_conflicting_evidence(container) -> None:
    event = container.events.create(
        EventCreate(type="system_alert", payload={"summary": "Mismatch detected", "conflicting_evidence": True})
    )
    run(container.orchestrator.process_pending_events())

    approvals = container.approvals.list_pending()
    tasks = container.tasks.list()

    assert event.trace_id == UUID(str(event.trace_id))
    assert approvals, "kill-switch should create an approval request"
    assert approvals[0].reason == "kill_switch_triggered"
    assert tasks[0].status == TaskStatus.ESCALATED


def test_approval_queue_workflow(container, test_config: AppConfig) -> None:
    event = container.events.create(
        EventCreate(type="invoice_request", payload={"amount": 2_000, "customer": "ACME", "margin": 0.5})
    )
    run(container.orchestrator.process_pending_events())

    pending = container.approvals.list_pending()
    assert len(pending) == 1

    approval = container.orchestrator.process_approval_action(
        pending[0].id,
        actor="ceo",
        action="approve",
        reason="within policy",
        override_scope=None,
        override_ttl_seconds=None,
    )
    assert approval.status is ApprovalStatus.APPROVED

    run(container.orchestrator.process_pending_tasks())
    tasks = container.tasks.list()
    assert tasks[0].status == TaskStatus.COMPLETED
    audit_entries = container.audit.list_by_trace(event.trace_id)
    assert audit_entries, "resumed task should be audited"


def test_rollback_handler_invoked_for_l3_post_check_failure(container) -> None:
    event = container.events.create(
        EventCreate(
            type="invoice_request",
            payload={
                "amount": 900,
                "customer": "Rollback Co",
                "margin": 0.6,
                "auto_send_limit": 100,
                "force_post_check_fail": True,
            },
        )
    )
    run(container.orchestrator.process_pending_events())

    tasks = container.tasks.list()
    approvals = container.approvals.list_pending()

    assert tasks[0].status == TaskStatus.ESCALATED
    assert approvals, "post-check failure should escalate"
    assert any(rb["tool"] == "send_invoice" for rb in container.tool_state.rollbacks)
