import os
from importlib import reload

from ..core import config
from ..core.db import get_session, init_db


def test_get_session_singleton(tmp_path):
    os.environ["DATABASE_URL"] = f"sqlite:///{tmp_path}/test.db"
    reload(config)
    init_db()
    first = next(get_session())
    second = next(get_session())
    assert first.bind is second.bind
    first.close()
    second.close()
