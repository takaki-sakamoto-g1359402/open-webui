from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Iterator

import pytest
from fastapi.testclient import TestClient

TEST_DB_PATH = Path('/tmp/realitybridge_core_test.sqlite3')
if TEST_DB_PATH.exists():
    TEST_DB_PATH.unlink()

os.environ.setdefault('RB_DATABASE_URL', f'sqlite:///{TEST_DB_PATH}')
os.environ.setdefault('RB_REDIS_URL', 'redis://localhost:6379/15')
os.environ.setdefault('RB_JWT_SECRET', 'test-secret')
os.environ.setdefault('RB_BOOTSTRAP_ADMIN_EMAIL', 'admin@realitybridge.local')
os.environ.setdefault('RB_BOOTSTRAP_ADMIN_PASSWORD', 'ChangeMe123!')
os.environ.setdefault('RB_ENABLE_BOOTSTRAP', 'false')


class FakeRedis:
    def __init__(self) -> None:
        self.events: list[dict[str, Any]] = []

    def xadd(self, stream: str, fields: dict[str, str]) -> str:
        self.events.append({'stream': stream, 'fields': fields})
        return str(len(self.events))

    def ping(self) -> bool:
        return True

    def close(self) -> None:
        return None


@pytest.fixture()
def client(monkeypatch: pytest.MonkeyPatch) -> Iterator[TestClient]:
    import apps.api.main as api_main
    from realitybridge_core.db.base import Base
    from realitybridge_core.db.session import engine

    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    fake_redis = FakeRedis()
    monkeypatch.setattr(api_main, 'build_redis_client', lambda: fake_redis)
    with TestClient(api_main.app) as test_client:
        yield test_client


@pytest.fixture()
def enable_bootstrap(monkeypatch: pytest.MonkeyPatch) -> None:
    from realitybridge_core.api import routers
    from realitybridge_core.config import get_settings

    shared_settings = get_settings()
    monkeypatch.setattr(shared_settings, 'enable_bootstrap', True)
    monkeypatch.setattr(shared_settings, 'env', 'test')
    monkeypatch.setattr(routers.settings, 'enable_bootstrap', True)
    monkeypatch.setattr(routers.settings, 'env', 'test')
