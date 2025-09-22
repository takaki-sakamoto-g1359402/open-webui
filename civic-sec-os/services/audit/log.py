"""Tamper evident audit trail."""
from __future__ import annotations

import hashlib
from dataclasses import dataclass
from datetime import datetime
from typing import Dict, List, Optional


@dataclass
class AuditEvent:
    subject: str
    action: str
    resource: str
    decision: str
    timestamp: datetime
    justification: str
    previous_hash: str

    def compute_hash(self) -> str:
        payload = f"{self.subject}|{self.action}|{self.resource}|{self.decision}|{self.timestamp.isoformat()}|{self.justification}|{self.previous_hash}"
        return hashlib.sha256(payload.encode()).hexdigest()


class AuditLog:
    def __init__(self) -> None:
        self.events: List[AuditEvent] = []
        self.daily_anchors: Dict[str, str] = {}

    def append(
        self,
        *,
        subject: str,
        action: str,
        resource: str,
        decision: str,
        justification: str,
        timestamp: Optional[datetime] = None,
    ) -> str:
        timestamp = timestamp or datetime.utcnow()
        previous_hash = self.events[-1].compute_hash() if self.events else "GENESIS"
        event = AuditEvent(
            subject=subject,
            action=action,
            resource=resource,
            decision=decision,
            timestamp=timestamp,
            justification=justification,
            previous_hash=previous_hash,
        )
        self.events.append(event)
        day_key = timestamp.strftime("%Y-%m-%d")
        self.daily_anchors.setdefault(day_key, event.compute_hash())
        return event.compute_hash()

    def verify_chain(self) -> bool:
        previous_hash = "GENESIS"
        for event in self.events:
            expected = hashlib.sha256(
                f"{event.subject}|{event.action}|{event.resource}|{event.decision}|{event.timestamp.isoformat()}|{event.justification}|{previous_hash}".encode()
            ).hexdigest()
            if expected != event.compute_hash():
                return False
            previous_hash = event.compute_hash()
        return True

    def notarization_anchor(self, date: datetime) -> Optional[str]:
        return self.daily_anchors.get(date.strftime("%Y-%m-%d"))


__all__ = ["AuditEvent", "AuditLog"]
