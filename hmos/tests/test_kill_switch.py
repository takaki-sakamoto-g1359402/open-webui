from hmos.event_bus import InMemoryEventBus
from hmos.orchestrator import Orchestrator
from hmos.settings import Settings
from hmos.storage import Storage


def test_kill_switch_halts_run(tmp_path) -> None:
    db_path = tmp_path / "hmos.db"
    storage = Storage(str(db_path))
    storage.set_kill_switch(True)
    settings = Settings(sqlite_path=str(db_path), file_sandbox_root=str(tmp_path / "sandbox"))
    orchestrator = Orchestrator(storage, InMemoryEventBus(), settings)

    result = orchestrator.run("Check status")
    assert result.status.value == "HALTED"
