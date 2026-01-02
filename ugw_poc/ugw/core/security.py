from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Dict

from fastapi import HTTPException, Request

from ugw.core.config import settings


@dataclass
class ActorContext:
    actor_id: str
    role: str
    request_id: str
    ip: str


class RateLimiter:
    def __init__(self, limit: int) -> None:
        self.limit = limit
        self._records: Dict[str, list[float]] = {}

    def check(self, key: str) -> None:
        now = time.time()
        window_start = now - 60
        timestamps = [ts for ts in self._records.get(key, []) if ts >= window_start]
        if len(timestamps) >= self.limit:
            raise HTTPException(status_code=429, detail="Rate limit exceeded")
        timestamps.append(now)
        self._records[key] = timestamps


rate_limiter = RateLimiter(settings.rate_limit_per_minute)


def get_actor_context(request: Request) -> ActorContext:
    actor_id = request.headers.get("X-Actor-Id")
    role = request.headers.get("X-Role")
    request_id = request.headers.get("X-Request-Id", "unknown")
    if not actor_id or not role:
        raise HTTPException(status_code=401, detail="Missing actor headers")
    ip = request.client.host if request.client else "unknown"
    return ActorContext(actor_id=actor_id, role=role, request_id=request_id, ip=ip)


def enforce_size_limit(request: Request) -> None:
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > settings.request_max_bytes:
        raise HTTPException(status_code=413, detail="Request too large")


def apply_rate_limit(actor: ActorContext) -> None:
    rate_limiter.check(actor.actor_id)
    rate_limiter.check(actor.ip)
