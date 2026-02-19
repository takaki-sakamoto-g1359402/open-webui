"""Policy engine and risk-tier decisions."""

from __future__ import annotations

from dataclasses import dataclass

from orchestrator_os.core.models import PolicyDecision, RiskTier


@dataclass
class PolicyResult:
    decision: PolicyDecision
    reason: str


class PolicyEngine:
    def __init__(self, r3_whitelist: set[str] | None = None) -> None:
        self.r3_whitelist = r3_whitelist or set()

    def evaluate(self, tool_name: str, risk_tier: RiskTier, sandbox_ok: bool = True) -> PolicyResult:
        if risk_tier == RiskTier.R0:
            return PolicyResult(PolicyDecision.ALLOW, "R0 allowed")
        if risk_tier == RiskTier.R1:
            if sandbox_ok:
                return PolicyResult(PolicyDecision.ALLOW, "R1 allowed in sandbox")
            return PolicyResult(PolicyDecision.DENY, "Sandbox constraint violated")
        if risk_tier == RiskTier.R2:
            return PolicyResult(PolicyDecision.REQUIRE_APPROVAL, "R2 requires approval")
        if tool_name not in self.r3_whitelist:
            return PolicyResult(PolicyDecision.DENY, "R3 denied unless whitelisted")
        return PolicyResult(PolicyDecision.REQUIRE_APPROVAL, "Whitelisted R3 requires approval")
