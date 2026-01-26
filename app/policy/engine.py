from __future__ import annotations

from collections import Counter, deque
from dataclasses import dataclass, field
from typing import Any

from app.schemas.common import ApprovalSecurityLevel, PermissionLevel, PolicyDecision


@dataclass
class PolicyConfig:
    action_rate_limit_per_hour: int = 12
    external_rate_limit_per_hour: int = 6
    finance_amount_threshold: float = 5000.0
    finance_spike_multiplier: float = 1.5
    allowlisted_recipient_domains: set[str] = field(
        default_factory=lambda: {"example.com", "customer.org", "trusted.test"}
    )
    blocked_tools: set[str] = field(default_factory=lambda: {"delete_production_data"})
    allowed_hours_utc: tuple[int, int] = (0, 23)
    complaint_escalation_keywords: tuple[str, ...] = ("angry", "refund", "lawsuit", "breach")


class AnomalyDetector:
    def __init__(self, config: PolicyConfig) -> None:
        self.config = config
        self._recent_actions: deque[dict[str, Any]] = deque(maxlen=200)
        self._finance_history: deque[float] = deque(maxlen=30)

    def record_action(self, action: dict[str, Any]) -> None:
        self._recent_actions.append(action)
        amount = action.get("amount")
        if isinstance(amount, (int, float)) and amount > 0:
            self._finance_history.append(float(amount))

    def _rolling_average(self) -> float:
        if not self._finance_history:
            return 0.0
        return sum(self._finance_history) / len(self._finance_history)

    def check(self, context: dict[str, Any]) -> list[str]:
        reasons: list[str] = []
        recent_count = len(self._recent_actions)
        if recent_count > self.config.action_rate_limit_per_hour:
            reasons.append("rate_anomaly:too_many_actions")

        external_count = sum(1 for action in self._recent_actions if action.get("external_impact"))
        if external_count > self.config.external_rate_limit_per_hour:
            reasons.append("rate_anomaly:external_spike")

        amount = context.get("amount")
        if isinstance(amount, (int, float)) and amount > self.config.finance_amount_threshold:
            reasons.append("financial_anomaly:amount_threshold")
            avg = self._rolling_average()
            if avg > 0 and float(amount) > avg * self.config.finance_spike_multiplier:
                reasons.append("financial_anomaly:spike_vs_average")

        outbound_bodies = [action.get("content_hash") for action in self._recent_actions if action.get("content_hash")]
        counts = Counter(outbound_bodies)
        if any(count >= 3 for count in counts.values()):
            reasons.append("comm_anomaly:repeated_content")

        domain = context.get("recipient_domain")
        if domain and domain not in self.config.allowlisted_recipient_domains:
            reasons.append("comm_anomaly:unallowlisted_domain")

        invoked_hour = context.get("invoked_hour_utc")
        start_hour, end_hour = self.config.allowed_hours_utc
        if isinstance(invoked_hour, int) and not (start_hour <= invoked_hour <= end_hour):
            reasons.append("access_anomaly:outside_allowed_hours")

        workflow = context.get("workflow")
        if workflow == "suspicious_instruction":
            reasons.append("access_anomaly:unexpected_workflow_context")

        complaints = context.get("complaint_signals", [])
        complaint_text = " ".join(str(item).lower() for item in complaints)
        if any(keyword in complaint_text for keyword in self.config.complaint_escalation_keywords):
            reasons.append("sentiment_risk:escalation")

        conflicting = context.get("conflicting_evidence")
        if conflicting:
            reasons.append("evidence_conflict:conflicting_sources")

        missing_evidence = context.get("missing_evidence")
        if missing_evidence:
            reasons.append("evidence_missing:reference_unavailable")

        return reasons


class PolicyEngine:
    def __init__(self, config: PolicyConfig | None = None) -> None:
        self.config = config or PolicyConfig()
        self.anomaly_detector = AnomalyDetector(self.config)

    def evaluate(self, action: dict[str, Any]) -> PolicyDecision:
        tool_name = action.get("tool_name", "unknown")
        permission_level = PermissionLevel(action.get("permission_level", PermissionLevel.L1_PROPOSE.value))
        external_impact = bool(action.get("external_impact", False))
        requested_asl = action.get("required_asl")

        if tool_name in self.config.blocked_tools:
            return PolicyDecision(
                allowed=False,
                requires_approval=True,
                reasons=["blocked_tool"],
                required_level=PermissionLevel.L4_HIGH_RISK,
                required_asl=ApprovalSecurityLevel.ASL3_PQC_ARTIFACT,
            )

        anomaly_reasons = self.anomaly_detector.check(action)
        if anomaly_reasons:
            return PolicyDecision(
                allowed=False,
                requires_approval=True,
                reasons=anomaly_reasons,
                required_level=PermissionLevel.L4_HIGH_RISK,
                required_asl=ApprovalSecurityLevel.ASL3_PQC_ARTIFACT,
            )

        if permission_level == PermissionLevel.L4_HIGH_RISK:
            required_asl = ApprovalSecurityLevel(requested_asl or ApprovalSecurityLevel.ASL3_PQC_ARTIFACT)
            return PolicyDecision(
                allowed=False,
                requires_approval=True,
                reasons=["high_risk_requires_ceo"],
                required_level=PermissionLevel.L4_HIGH_RISK,
                required_asl=required_asl,
            )

        if permission_level == PermissionLevel.L3_CONDITIONAL_EXECUTE:
            if not external_impact:
                return PolicyDecision(allowed=True, reasons=["conditional_internal_ok"], required_level=permission_level)
            domain = action.get("recipient_domain")
            if domain and domain not in self.config.allowlisted_recipient_domains:
                return PolicyDecision(
                    allowed=False,
                    requires_approval=True,
                    reasons=["recipient_domain_not_allowlisted"],
                    required_level=PermissionLevel.L4_HIGH_RISK,
                    required_asl=ApprovalSecurityLevel.ASL2_PASSKEY_OTP,
                )
            return PolicyDecision(
                allowed=True,
                reasons=["conditional_external_with_safeguards"],
                required_level=permission_level,
            )

        if permission_level == PermissionLevel.L2_INTERNAL_EXECUTE and external_impact:
            return PolicyDecision(
                allowed=False,
                requires_approval=True,
                reasons=["l2_internal_boundary_violation"],
                required_level=PermissionLevel.L3_CONDITIONAL_EXECUTE,
                required_asl=ApprovalSecurityLevel.ASL2_PASSKEY_OTP,
            )

        return PolicyDecision(allowed=True, reasons=["policy_allow"], required_level=permission_level)

    def record_success(self, action: dict[str, Any]) -> None:
        self.anomaly_detector.record_action(action)
