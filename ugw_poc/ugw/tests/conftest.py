from __future__ import annotations

import importlib
import os
from pathlib import Path

import pytest


def reload_settings(tmp_path: Path) -> None:
    os.environ["UGW_DB_PATH"] = str(tmp_path / "app.db")
    os.environ["UGW_AUDIT_DB_PATH"] = str(tmp_path / "audit.db")
    os.environ["UGW_AUDIT_KEY_PATH"] = str(tmp_path / "audit_keys.json")
    os.environ["UGW_ENCRYPTION_KEY_PATH"] = str(tmp_path / "encryption.key")
    os.environ["UGW_ORACLE_KEY_PATH"] = str(tmp_path / "oracle_keys.json")

    import ugw.core.config

    importlib.reload(ugw.core.config)
    import ugw.core.keys
    importlib.reload(ugw.core.keys)
    import ugw.db.database
    importlib.reload(ugw.db.database)
    import ugw.audit.log
    importlib.reload(ugw.audit.log)


@pytest.fixture()
def temp_settings(tmp_path: Path):
    reload_settings(tmp_path)
    yield tmp_path
