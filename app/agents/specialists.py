from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from app.schemas.enums import PermissionLevel


@dataclass(slots=True)
class AgentPlanStep:
    agent_id: str
    tool_name: str
    permission_level: PermissionLevel
    input_payload: dict[str, Any]
    evidence: list[str]
    uncertainty: float
    rationale: str


@dataclass(slots=True)
class SpecialistAgent:
    agent_id: str
    role: str
    allowed_tools: set[str]

    def plan(self, event_type: str, payload: dict[str, Any]) -> list[AgentPlanStep]:
        method = getattr(self, f"_plan_{event_type}", None)
        if method is None:
            return [
                AgentPlanStep(
                    agent_id=self.agent_id,
                    tool_name="create_ticket",
                    permission_level=PermissionLevel.L2_EXECUTE_LOW_RISK,
                    input_payload={
                        "summary": f"Unhandled event type: {event_type}",
                        "priority": "low",
                    },
                    evidence=["event_unrecognized"],
                    uncertainty=0.6,
                    rationale="Fallback to ticket creation for manual review.",
                )
            ]
        return method(payload)

    def _self_check(self, evidence: list[str], uncertainty: float) -> tuple[list[str], float]:
        normalized_uncertainty = min(max(uncertainty, 0.0), 1.0)
        if not evidence:
            evidence = ["no_evidence_provided"]
            normalized_uncertainty = max(normalized_uncertainty, 0.7)
        return evidence, normalized_uncertainty


class SalesMarketingAgent(SpecialistAgent):
    def _plan_sales_lead(self, payload: dict[str, Any]) -> list[AgentPlanStep]:
        evidence, uncertainty = self._self_check(["crm_lead", "lead_score"], 0.2)
        lead_id = payload.get("lead_id", "lead-unknown")
        return [
            AgentPlanStep(
                agent_id=self.agent_id,
                tool_name="update_crm",
                permission_level=PermissionLevel.L2_EXECUTE_LOW_RISK,
                input_payload={
                    "lead_id": lead_id,
                    "status": "enriched",
                    "notes": payload.get("notes", "Lead enriched with public data"),
                },
                evidence=evidence,
                uncertainty=uncertainty,
                rationale="Update CRM with enrichment notes and prepare outreach variants offline.",
            ),
            AgentPlanStep(
                agent_id=self.agent_id,
                tool_name="draft_message",
                permission_level=PermissionLevel.L1_PROPOSE,
                input_payload={
                    "channel": "email",
                    "subject": f"Intro for {lead_id}",
                    "body": payload.get(
                        "outreach_template",
                        "Hi there — sharing a tailored idea based on your recent announcement.",
                    ),
                },
                evidence=evidence,
                uncertainty=uncertainty,
                rationale="Draft multiple outreach variants without sending them.",
            ),
        ]


class OpsCustomerAgent(SpecialistAgent):
    def _plan_customer_complaint(self, payload: dict[str, Any]) -> list[AgentPlanStep]:
        sentiment_risk = float(payload.get("sentiment_risk", 0.0))
        evidence, uncertainty = self._self_check(["customer_message", "account_history"], 0.3)
        priority = "high" if sentiment_risk >= 0.75 else "normal"
        return [
            AgentPlanStep(
                agent_id=self.agent_id,
                tool_name="create_ticket",
                permission_level=PermissionLevel.L2_EXECUTE_LOW_RISK,
                input_payload={
                    "summary": payload.get("summary", "Customer complaint received"),
                    "priority": priority,
                    "sentiment_risk": sentiment_risk,
                },
                evidence=evidence,
                uncertainty=uncertainty,
                rationale="Log complaint immediately and prepare a draft response.",
            ),
            AgentPlanStep(
                agent_id=self.agent_id,
                tool_name="draft_message",
                permission_level=PermissionLevel.L1_PROPOSE,
                input_payload={
                    "channel": "email",
                    "subject": payload.get("subject", "We are on it"),
                    "body": payload.get(
                        "draft_response",
                        "Thank you for raising this. We have escalated internally and will follow up shortly.",
                    ),
                    "sentiment_risk": sentiment_risk,
                },
                evidence=evidence,
                uncertainty=uncertainty,
                rationale="Draft response but hold for approval if escalation triggers fire.",
            ),
        ]


class FinanceLegalAgent(SpecialistAgent):
    def _plan_invoice_request(self, payload: dict[str, Any]) -> list[AgentPlanStep]:
        amount = float(payload.get("amount", 0))
        evidence, uncertainty = self._self_check(["statement_of_work", "pricing_sheet"], 0.25)
        permission_level = (
            PermissionLevel.L2_EXECUTE_LOW_RISK
            if amount <= float(payload.get("auto_send_limit", 5_000))
            else PermissionLevel.L3_EXECUTE_CONDITIONAL
        )
        return [
            AgentPlanStep(
                agent_id=self.agent_id,
                tool_name="send_invoice",
                permission_level=permission_level,
                input_payload={
                    "amount": amount,
                    "customer": payload.get("customer", "unknown"),
                    "margin": payload.get("margin", 0.4),
                    "force_post_check_fail": payload.get("force_post_check_fail", False),
                },
                evidence=evidence,
                uncertainty=uncertainty,
                rationale="Issue invoice within approved limits; otherwise require conditional checks.",
            )
        ]


class EngineeringAutomationAgent(SpecialistAgent):
    def _plan_system_alert(self, payload: dict[str, Any]) -> list[AgentPlanStep]:
        evidence, uncertainty = self._self_check(["monitoring_alert", "runbook"], 0.35)
        severity = payload.get("severity", "medium")
        summary = payload.get("summary", f"System alert: {severity}")
        return [
            AgentPlanStep(
                agent_id=self.agent_id,
                tool_name="create_ticket",
                permission_level=PermissionLevel.L2_EXECUTE_LOW_RISK,
                input_payload={
                    "summary": summary,
                    "priority": "high" if severity in {"high", "critical"} else "normal",
                    "anomaly_score": payload.get("anomaly_score", 0.0),
                    "conflicting_evidence": payload.get("conflicting_evidence", False),
                },
                evidence=evidence,
                uncertainty=uncertainty,
                rationale="Create an engineering ticket and attach runbook references.",
            )
        ]



def build_specialists() -> dict[str, SpecialistAgent]:
    return {
        "AI1": SalesMarketingAgent(
            agent_id="AI1",
            role="Sales and marketing automation",
            allowed_tools={"update_crm", "draft_message", "create_ticket"},
        ),
        "AI2": OpsCustomerAgent(
            agent_id="AI2",
            role="Operations and customer support",
            allowed_tools={"create_ticket", "draft_message"},
        ),
        "AI3": FinanceLegalAgent(
            agent_id="AI3",
            role="Finance and legal helper",
            allowed_tools={"send_invoice", "draft_message", "create_ticket"},
        ),
        "AI4": EngineeringAutomationAgent(
            agent_id="AI4",
            role="Engineering and automation",
            allowed_tools={"create_ticket"},
        ),
    }
