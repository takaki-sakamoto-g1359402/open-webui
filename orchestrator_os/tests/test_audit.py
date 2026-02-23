from orchestrator_os.storage.audit_store import AuditStore
from orchestrator_os.storage.db import init_db


def test_hash_chain_verification(tmp_path, monkeypatch):
    monkeypatch.setenv("ORCHESTRATOR_DB_PATH", str(tmp_path / "db.sqlite"))
    init_db()
    store = AuditStore()
    tid = "task-audit"
    store.append_event(tid, "one", "agent", {"x": 1})
    store.append_event(tid, "two", "agent", {"x": 2})
    ok, details = store.verify_chain(tid)
    assert ok is True
    assert details == "ok"
