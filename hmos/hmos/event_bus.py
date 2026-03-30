from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Protocol

import redis


@dataclass(frozen=True)
class Event:
    event_type: str
    trace_id: str
    payload: Dict[str, Any]


class EventBus(Protocol):
    def publish(self, event: Event) -> None: ...

    def read_all(self) -> List[Event]: ...


class InMemoryEventBus:
    def __init__(self) -> None:
        self._events: List[Event] = []

    def publish(self, event: Event) -> None:
        self._events.append(event)

    def read_all(self) -> List[Event]:
        return list(self._events)


class RedisEventBus:
    def __init__(self, url: str = "redis://localhost:6379/0", stream: str = "hmos") -> None:
        self._client = redis.Redis.from_url(url)
        self._stream = stream

    def publish(self, event: Event) -> None:
        self._client.xadd(self._stream, {
            "event_type": event.event_type,
            "trace_id": event.trace_id,
            "payload": json_dumps(event.payload),
        })

    def read_all(self) -> List[Event]:
        events: List[Event] = []
        for _, entries in self._client.xrange(self._stream):
            fields = {k.decode("utf-8"): v.decode("utf-8") for k, v in entries.items()}
            events.append(
                Event(
                    event_type=fields["event_type"],
                    trace_id=fields["trace_id"],
                    payload=json_loads(fields["payload"]),
                )
            )
        return events


def json_dumps(payload: Dict[str, Any]) -> str:
    import json

    return json.dumps(payload)


def json_loads(value: str) -> Dict[str, Any]:
    import json

    return json.loads(value)
