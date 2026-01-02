from __future__ import annotations

import pytest

from fastapi import HTTPException

from ugw.core.security import RateLimiter


def test_rate_limit_smoke():
    limiter = RateLimiter(limit=2)
    limiter.check("user")
    limiter.check("user")
    with pytest.raises(HTTPException):
        limiter.check("user")
