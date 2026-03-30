from hmos.models import RiskLevel
from hmos.policy import evaluate_risk


def test_risk2_requires_approval() -> None:
    decision = evaluate_risk(RiskLevel.RISK2)
    assert decision.allowed is True
    assert decision.requires_approval is True


def test_risk3_denied() -> None:
    decision = evaluate_risk(RiskLevel.RISK3)
    assert decision.allowed is False
    assert decision.requires_approval is False
