import os
from importlib import reload
import pytest
from httpx import AsyncClient

from ..main import app
from ..core import config
from ..core.db import init_db


@pytest.fixture(autouse=True)
def setup(tmp_path):
    os.environ["DATABASE_URL"] = f"sqlite:///{tmp_path}/test.db"
    reload(config)
    init_db()
    yield


@pytest.mark.asyncio
async def test_profile_crud():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        r = await ac.post(
            "/auth/register",
            json={"email": "p@test", "password": "pw", "id_document": "id"},
        )
        token = r.json()["access_token"]
        data = {"preferred_lang": "en", "data": {"en": "hello"}}
        res = await ac.put(
            "/profiles/p@test", json=data, headers={"Authorization": f"Bearer {token}"}
        )
        assert res.status_code == 200
        res2 = await ac.get("/profiles/p@test", params={"lang": "en"})
        assert res2.status_code == 200
        assert res2.json()["text"] == "hello"
