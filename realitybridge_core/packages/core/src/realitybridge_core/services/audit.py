from typing import Any

from sqlalchemy.orm import Session

from realitybridge_core.domain.models import AuditLog


def record_audit(
    session: Session,
    *,
    actor_type: str,
    actor_id: str,
    action: str,
    target_type: str,
    target_id: str,
    severity: str,
    request_id: str = "",
    correlation_id: str = "",
    details: dict[str, Any] | None = None,
) -> AuditLog:
    audit = AuditLog(
        actor_type=actor_type,
        actor_id=actor_id,
        action=action,
        target_type=target_type,
        target_id=target_id,
        severity=severity,
        request_id=request_id,
        correlation_id=correlation_id,
        details=details or {},
    )
    session.add(audit)
    session.flush()
    return audit
