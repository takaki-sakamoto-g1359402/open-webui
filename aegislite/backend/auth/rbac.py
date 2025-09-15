import os
from functools import lru_cache

import casbin


@lru_cache()
def get_enforcer() -> casbin.Enforcer:
    """Return a cached Casbin enforcer."""
    base = os.path.dirname(__file__)
    model = os.path.join(base, "model.conf")
    policy = os.path.join(base, "policy.csv")
    return casbin.Enforcer(model, policy)


def check_access(user, action: str, sensitivity: int) -> bool:
    """Check whether the user can perform `action` on a mission with `sensitivity`."""
    enforcer = get_enforcer()
    return enforcer.enforce(user.role, user.org, sensitivity, action)
