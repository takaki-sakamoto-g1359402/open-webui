from __future__ import annotations

from typing import Any, Dict

from ugw.audit.log import append_event


def record_event(
    actor_id: str,
    role: str,
    action: str,
    resource_type: str,
    resource_id: str,
    request_id: str,
    decision: str,
    why: Dict[str, Any],
    what: Dict[str, Any],
    denial_reason: str | None = None,
) -> Dict[str, Any]:
    event = {
        "actor_id": actor_id,
        "role": role,
        "action": action,
        "resource_type": resource_type,
        "resource_id": resource_id,
        "request_id": request_id,
        "decision": decision,
        "why": why,
        "what": what,
        "denial_reason": denial_reason,
    }
    return append_event(event)
