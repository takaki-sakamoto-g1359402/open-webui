import os
import pytest
from httpx import AsyncClient

from ..main import app
from ..core.db import init_db


@pytest.fixture(autouse=True)
def setup(tmp_path):
    os.environ["DATABASE_URL"] = f"sqlite:///{tmp_path}/test.db"
    init_db()
    yield


@pytest.mark.asyncio
async def test_register_and_login():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        r = await ac.post("/auth/register", json={"email": "a@test", "password": "pw", "id_document": "id"})
        assert r.status_code == 200
        token = r.json()["access_token"]
        assert token

        r2 = await ac.post("/auth/login", json={"email": "a@test", "password": "pw"})
        assert r2.status_code == 200
