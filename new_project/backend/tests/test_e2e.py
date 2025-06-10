import os
from importlib import reload

import pytest
from httpx import AsyncClient

from ..core import config
from ..core.db import init_db
from ..main import app


@pytest.fixture(autouse=True)
def setup(tmp_path):
    os.environ["DATABASE_URL"] = f"sqlite:///{tmp_path}/test.db"
    reload(config)
    init_db()
    yield


@pytest.mark.asyncio
async def test_register_to_profile():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        res = await ac.post(
            "/auth/register",
            json={"email": "e2e@test", "password": "pw", "id_document": "id"},
        )
        assert res.status_code == 200
        token = res.json()["access_token"]
        data = {"preferred_lang": "en", "data": {"en": "hello"}}
        resp = await ac.put(
            "/profiles/e2e@test",
            json=data,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        got = await ac.get("/profiles/e2e@test", params={"lang": "en"})
        assert got.status_code == 200
        assert got.json()["text"] == "hello"
