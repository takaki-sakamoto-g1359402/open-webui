from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from app.schemas.enums import PermissionLevel
from app.schemas.models import PolicyDecision
from app.utils.config import GovernanceConfig

SUSPICIOUS_KEYWORDS = {
    "wire transfer",
    "delete production",
    "drop table",
    "exfiltrate",
    "bypass policy",
}


@dataclass(slots=True)
class PolicyEngine:
    config: GovernanceConfig

    def evaluate_tool_call(
        self,
        *,
        tool_name: str,
        requested_level: PermissionLevel,
        payload: dict[str, Any],
        tool_required_level: PermissionLevel,
        agent_allowed: bool,
    ) -> PolicyDecision:
        reasons: list[str] = []
        escalation_reasons: list[str] = []

        required_level = max(requested_level, tool_required_level)
        requires_approval = required_level == PermissionLevel.L4_HIGH_RISK
        allowed = True
        kill_switch = False

        if not agent_allowed:
            allowed = False
            reasons.append("tool_not_allowed_for_agent")
            kill_switch = True
            escalation_reasons.append("tool_misuse_suspected")

        instruction_text = str(payload).lower()
        if any(keyword in instruction_text for keyword in SUSPICIOUS_KEYWORDS):
            allowed = False
            kill_switch = True
            reasons.append("suspicious_instruction")
            escalation_reasons.append("security_alert")

        if required_level == PermissionLevel.L4_HIGH_RISK:
            allowed = False
            requires_approval = True
            reasons.append("l4_requires_ceo_approval")

        amount = payload.get("amount")
        if isinstance(amount, (int, float)) and amount > self.config.invoice_amount_threshold:
            requires_approval = True
            reasons.append("amount_exceeds_threshold")
            if required_level < PermissionLevel.L4_HIGH_RISK:
                required_level = PermissionLevel.L3_EXECUTE_CONDITIONAL

        evidence_conflict = bool(payload.get("conflicting_evidence"))
        if evidence_conflict:
            kill_switch = True
            allowed = False
            reasons.append("conflicting_evidence")
            escalation_reasons.append("evidence_conflict")

        anomaly_score = payload.get("anomaly_score")
        if isinstance(anomaly_score, (int, float)) and anomaly_score >= self.config.anomaly_threshold:
            kill_switch = True
            allowed = False
            reasons.append("anomaly_detected")
            escalation_reasons.append("anomaly_threshold_breached")

        margin = payload.get("margin")
        if isinstance(margin, (int, float)) and margin < self.config.margin_floor:
            kill_switch = True
            allowed = False
            reasons.append("margin_floor_breached")
            escalation_reasons.append("margin_risk")

        sentiment = payload.get("sentiment_risk")
        if isinstance(sentiment, (int, float)) and sentiment >= self.config.sentiment_escalation_threshold:
            reasons.append("sentiment_escalation")
            if required_level >= PermissionLevel.L3_EXECUTE_CONDITIONAL:
                requires_approval = True
            escalation_reasons.append("high_value_account_risk")

        return PolicyDecision(
            allowed=allowed,
            requires_approval=requires_approval,
            reasons=reasons,
            required_level=required_level,
            kill_switch=kill_switch,
            escalation_reasons=escalation_reasons,
        )

    def evaluate_post_check(
        self,
        *,
        tool_name: str,
        result: dict[str, Any],
        required_level: PermissionLevel,
    ) -> PolicyDecision:
        reasons: list[str] = []
        escalation_reasons: list[str] = []
        allowed = True
        kill_switch = False

        if result.get("post_check_failed"):
            allowed = False
            reasons.append("post_check_failed")
            kill_switch = required_level >= PermissionLevel.L3_EXECUTE_CONDITIONAL
            if kill_switch:
                escalation_reasons.append("rollback_required")

        return PolicyDecision(
            allowed=allowed,
            requires_approval=required_level == PermissionLevel.L4_HIGH_RISK,
            reasons=reasons,
            required_level=required_level,
            kill_switch=kill_switch,
            escalation_reasons=escalation_reasons,
        )
