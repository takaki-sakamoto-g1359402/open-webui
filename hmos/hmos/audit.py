from __future__ import annotations

import hashlib
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict

from hmos.utils.canonical_json import canonical_bytes, canonical_dumps


@dataclass(frozen=True)
class AuditEvent:
    schema_version: str
    timestamp_utc: str
    trace_id: str
    event_type: str
    data: Dict[str, Any]
    prev_hash: str
    event_hash: str


SCHEMA_VERSION = "1.0"


def build_audit_event(trace_id: str, event_type: str, data: Dict[str, Any], prev_hash: str) -> AuditEvent:
    timestamp_utc = datetime.now(timezone.utc).isoformat()
    payload = {
        "schema_version": SCHEMA_VERSION,
        "timestamp_utc": timestamp_utc,
        "trace_id": trace_id,
        "event_type": event_type,
        "data": data,
    }
    event_hash = hashlib.sha256(canonical_bytes(payload) + prev_hash.encode("utf-8")).hexdigest()
    return AuditEvent(
        schema_version=SCHEMA_VERSION,
        timestamp_utc=timestamp_utc,
        trace_id=trace_id,
        event_type=event_type,
        data=data,
        prev_hash=prev_hash,
        event_hash=event_hash,
    )


def serialize_event_data(data: Dict[str, Any]) -> str:
    return canonical_dumps(data)
