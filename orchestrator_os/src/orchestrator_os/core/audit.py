"""Hash-chained audit logging with canonical JSON serialization."""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from uuid import uuid4

from orchestrator_os.core.models import AuditEvent


class CanonicalJSONError(ValueError):
    """Raised when payload cannot be canonicalized safely."""


def canonical_json(data: object) -> str:
    try:
        return json.dumps(data, sort_keys=True, separators=(",", ":"), allow_nan=False)
    except (ValueError, TypeError) as exc:
        raise CanonicalJSONError(str(exc)) from exc


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def compute_event_hash(prev_hash: str, event_without_hash: dict[str, object]) -> str:
    body = canonical_json(event_without_hash)
    return hashlib.sha256(f"{prev_hash}{body}".encode("utf-8")).hexdigest()


def build_event(
    task_id: str,
    event_type: str,
    actor: str,
    payload: dict[str, object],
    prev_hash: str,
) -> AuditEvent:
    base = {
        "id": str(uuid4()),
        "timestamp": utc_now(),
        "task_id": task_id,
        "event_type": event_type,
        "actor": actor,
        "payload": payload,
        "prev_hash": prev_hash,
    }
    event_hash = compute_event_hash(prev_hash, base)
    return AuditEvent(**base, hash=event_hash)
