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
async def test_generate_redeem():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        # register admin
        res = await ac.post("/auth/register", json={"email": "admin@test", "password": "pw", "id_document": "id"})
        token_admin = res.json()["access_token"]
        # Force admin role by patching DB directly
        from ..core.db import get_session
        from ..models import User
        from sqlmodel import select
        with get_session() as s:
            u = s.exec(select(User).where(User.id == "admin@test")).first()
            u.role = "ADMIN"
            s.add(u)
            s.commit()
        # generate invite
        res2 = await ac.post("/invites/generate", headers={"Authorization": f"Bearer {token_admin}"})
        code = res2.json()["code"]
        # register member
        res3 = await ac.post("/auth/register", json={"email": "u@test", "password": "pw", "id_document": "id"})
        token_user = res3.json()["access_token"]
        # redeem
        res4 = await ac.post("/invites/redeem", json={"code": code}, headers={"Authorization": f"Bearer {token_user}"})
        assert res4.status_code == 200

