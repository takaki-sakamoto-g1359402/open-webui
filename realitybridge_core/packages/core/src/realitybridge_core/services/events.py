from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol

import orjson
from redis import Redis

from realitybridge_core.config import get_settings

settings = get_settings()


@dataclass(slots=True)
class DomainEvent:
    event_type: str
    aggregate_id: str
    payload: dict[str, Any]
    actor_id: str
    actor_type: str = "user"
    correlation_id: str = ""


class EventPublisher(Protocol):
    def publish(self, event: DomainEvent) -> str: ...


class RedisStreamEventPublisher:
    def __init__(self, redis: Redis):
        self.redis = redis

    def publish(self, event: DomainEvent) -> str:
        fields = {
            "event_type": event.event_type,
            "aggregate_id": event.aggregate_id,
            "payload": orjson.dumps(event.payload).decode(),
            "actor_id": event.actor_id,
            "actor_type": event.actor_type,
            "correlation_id": event.correlation_id,
        }
        return self.redis.xadd(settings.event_stream, fields)


class InMemoryEventPublisher:
    def __init__(self) -> None:
        self.events: list[DomainEvent] = []

    def publish(self, event: DomainEvent) -> str:
        self.events.append(event)
        return str(len(self.events))


def build_redis_client() -> Redis:
    return Redis.from_url(settings.redis_url, decode_responses=True)
