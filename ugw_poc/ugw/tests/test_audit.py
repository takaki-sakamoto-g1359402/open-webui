from __future__ import annotations

from ugw.audit.log import append_event, verify_log
from ugw.db.database import init_db


def test_audit_chain_and_merkle(temp_settings):
    init_db()
    for i in range(5):
        append_event(
            {
                "actor_id": "user-1",
                "role": "admin",
                "action": "test",
                "resource_type": "unit",
                "resource_id": f"res-{i}",
                "request_id": "req-1",
                "decision": "allow",
                "why": {"check": True},
                "what": {"index": i},
                "denial_reason": None,
            }
        )
    report = verify_log()
    assert report["verified"] is True
