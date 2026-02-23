from orchestrator_os.core.models import PolicyDecision, RiskTier
from orchestrator_os.core.policy import PolicyEngine


def test_policy_allow_and_deny_rules():
    engine = PolicyEngine()
    assert engine.evaluate("echo", RiskTier.R0).decision == PolicyDecision.ALLOW
    assert engine.evaluate("filesystem", RiskTier.R1, sandbox_ok=True).decision == PolicyDecision.ALLOW
    assert engine.evaluate("filesystem", RiskTier.R1, sandbox_ok=False).decision == PolicyDecision.DENY
    assert engine.evaluate("web_fetch", RiskTier.R2).decision == PolicyDecision.REQUIRE_APPROVAL
    assert engine.evaluate("danger", RiskTier.R3).decision == PolicyDecision.DENY


def test_policy_r3_whitelist_still_requires_approval():
    engine = PolicyEngine(r3_whitelist={"danger"})
    result = engine.evaluate("danger", RiskTier.R3)
    assert result.decision == PolicyDecision.REQUIRE_APPROVAL
