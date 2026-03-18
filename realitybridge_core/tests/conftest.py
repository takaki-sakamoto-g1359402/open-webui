from __future__ import annotations

import os
from pathlib import Path
from typing import Any

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
def client(monkeypatch: pytest.MonkeyPatch) -> TestClient:
    import apps.api.main as api_main

    fake_redis = FakeRedis()
    monkeypatch.setattr(api_main, 'build_redis_client', lambda: fake_redis)
    with TestClient(api_main.app) as test_client:
        yield test_client
