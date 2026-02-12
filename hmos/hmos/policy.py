from __future__ import annotations

from dataclasses import dataclass

from hmos.models import RiskLevel


@dataclass(frozen=True)
class PolicyDecision:
    allowed: bool
    requires_approval: bool
    reason: str


def evaluate_risk(risk_level: RiskLevel) -> PolicyDecision:
    if risk_level == RiskLevel.RISK3:
        return PolicyDecision(False, False, "Risk3 actions are forbidden in MVP")
    if risk_level == RiskLevel.RISK2:
        return PolicyDecision(True, True, "Risk2 requires approval")
    return PolicyDecision(True, False, "Allowed")
