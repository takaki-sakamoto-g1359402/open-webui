from hmos.event_bus import InMemoryEventBus
from hmos.orchestrator import Orchestrator
from hmos.settings import Settings
from hmos.storage import Storage


def test_full_run(tmp_path) -> None:
    db_path = tmp_path / "hmos.db"
    storage = Storage(str(db_path))
    settings = Settings(sqlite_path=str(db_path), file_sandbox_root=str(tmp_path / "sandbox"))
    orchestrator = Orchestrator(storage, InMemoryEventBus(), settings)

    result = orchestrator.run("Check status")
    assert result.status.value == "COMPLETED"

    steps = storage.get_steps_for_run(result.run_id)
    assert all(step["status"] == "EXECUTED" for step in steps)

    audit_events = storage.list_audit_events()
    assert audit_events
    for idx in range(1, len(audit_events)):
        assert audit_events[idx]["prev_hash"] == audit_events[idx - 1]["event_hash"]
