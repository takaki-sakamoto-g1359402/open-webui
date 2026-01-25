from __future__ import annotations

from typing import Any

from app.agents.specs import AgentSpec
from app.schemas.common import PermissionLevel
from app.utils.redaction import hash_payload


def _self_check(result: dict[str, Any], evidence: list[dict[str, Any]] | None = None) -> dict[str, Any]:
    evidence = evidence or []
    result["self_check"] = {
        "evidence_refs": evidence,
        "evidence_hash": hash_payload(evidence),
        "uncertainty": result.get("uncertainty", "medium"),
    }
    return result


def sales_marketing_handler(task: dict[str, Any]) -> dict[str, Any]:
    lead = task.get("payload", {}).get("lead", "unknown")
    send_external = bool(task.get("payload", {}).get("send_external")) or task.get("event_type") == "external_outreach"
    variations = [
        f"Hi {lead}, sharing a concise ROI snapshot.",
        f"{lead}, would a 15-minute demo help evaluate fit?",
        f"Quick idea for {lead}: automate onboarding follow-ups.",
    ]
    recommended_tool = "send_external_message" if send_external else "update_internal_crm"
    permission_level = (
        PermissionLevel.L3_CONDITIONAL_EXECUTE.value if send_external else PermissionLevel.L2_INTERNAL_EXECUTE.value
    )
    result = {
        "status": "proposed",
        "plan": ["enrich_lead", recommended_tool],
        "outreach_variations": variations,
        "recommended_tool": recommended_tool,
        "permission_level": permission_level,
        "external_action_requires": PermissionLevel.L3_CONDITIONAL_EXECUTE.value,
        "uncertainty": "medium",
    }
    return _self_check(result, task.get("evidence_refs"))


def ops_support_handler(task: dict[str, Any]) -> dict[str, Any]:
    complaint = task.get("payload", {}).get("message", "")
    draft = {
        "subject": "We are on it",
        "body": "Thanks for the heads up. We are investigating and will follow up shortly.",
        "tone": "calm",
        "draft_ref": "doc://support-draft",
        "contains_escalation": any(word in complaint.lower() for word in ["angry", "refund", "breach", "lawsuit"]),
    }
    result = {
        "status": "drafted",
        "draft_response": draft,
        "recommended_tool": "create_internal_ticket",
        "permission_level": PermissionLevel.L1_PROPOSE.value,
        "uncertainty": "low",
    }
    return _self_check(result, task.get("evidence_refs"))


def finance_legal_handler(task: dict[str, Any]) -> dict[str, Any]:
    invoice_amount = task.get("payload", {}).get("amount", 0)
    money_movement = task.get("event_type") == "money_movement"
    recommended_tool = "request_money_movement" if money_movement else "update_internal_crm"
    permission_level = PermissionLevel.L4_HIGH_RISK.value if money_movement else PermissionLevel.L2_INTERNAL_EXECUTE.value
    result = {
        "status": "assist_only",
        "invoice_draft": {
            "amount": invoice_amount,
            "currency": task.get("payload", {}).get("currency", "USD"),
            "draft_ref": "doc://invoice-draft",
        },
        "reminder_draft_ref": "doc://payment-reminder",
        "checklist": [
            "confirm deliverables",
            "verify tax handling",
            "obtain approval before sending externally",
        ],
        "legal_notice": "AI3 provides assistance only and cannot deliver legal conclusions.",
        "recommended_tool": recommended_tool,
        "permission_level": permission_level,
        "uncertainty": "medium",
    }
    return _self_check(result, task.get("evidence_refs"))


def engineering_handler(task: dict[str, Any]) -> dict[str, Any]:
    change = task.get("payload", {}).get("change", "automation")
    result = {
        "status": "planned",
        "plan": ["open_internal_ticket", "run_automation"],
        "change_summary": change,
        "recommended_tool": "create_internal_ticket",
        "permission_level": PermissionLevel.L2_INTERNAL_EXECUTE.value,
        "uncertainty": "medium",
    }
    return _self_check(result, task.get("evidence_refs"))


def build_agents() -> dict[str, AgentSpec]:
    return {
        "AI1": AgentSpec(
            agent_id="AI1",
            name="Sales & Marketing",
            role="Lead enrichment, outreach drafting, CRM updates.",
            allowed_tools={"update_internal_crm", "send_external_message"},
            default_permission=PermissionLevel.L2_INTERNAL_EXECUTE,
            handler=sales_marketing_handler,
            guidelines=["External sends require L3 safeguards.", "Log evidence and uncertainty."],
        ),
        "AI2": AgentSpec(
            agent_id="AI2",
            name="Ops & Customer Support",
            role="Customer support triage and drafting.",
            allowed_tools={"create_internal_ticket", "send_external_message"},
            default_permission=PermissionLevel.L1_PROPOSE,
            handler=ops_support_handler,
            guidelines=["Escalate negative sentiment or PR risk.", "Prefer drafts overnight."],
        ),
        "AI3": AgentSpec(
            agent_id="AI3",
            name="Finance & Legal Helper",
            role="Assist-only drafting and compliance checklists.",
            allowed_tools={"update_internal_crm", "request_money_movement"},
            default_permission=PermissionLevel.L2_INTERNAL_EXECUTE,
            assist_only=True,
            handler=finance_legal_handler,
            guidelines=["No legal conclusions.", "Money movement always requires CEO approval."],
        ),
        "AI4": AgentSpec(
            agent_id="AI4",
            name="Engineering & Automation",
            role="Automation planning and internal execution.",
            allowed_tools={"create_internal_ticket", "update_internal_crm"},
            default_permission=PermissionLevel.L2_INTERNAL_EXECUTE,
            handler=engineering_handler,
            guidelines=["Keep changes reversible.", "Use compensating actions for external impact."],
        ),
    }
