from aegislite.backend.auth import rbac
from aegislite.backend.auth.models import User


def test_policy_allow_deny():
    user_ops = User(username="op", role="operator", org="ops")
    user_intel = User(username="intel", role="operator", org="intel")
    assert rbac.check_access(user_ops, "approve", 2)
    assert not rbac.check_access(user_intel, "approve", 2)
