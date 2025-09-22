from datetime import datetime

from audit.log import AuditLog


def test_audit_chain_and_anchor():
    log = AuditLog()
    now = datetime(2024, 1, 2, 10, 0, 0)
    log.append(subject="user", action="view", resource="case", decision="allow", justification="need-to-know", timestamp=now)
    log.append(subject="user", action="view", resource="case", decision="allow", justification="follow-up", timestamp=now)
    assert log.verify_chain()
    assert log.notarization_anchor(now) is not None
