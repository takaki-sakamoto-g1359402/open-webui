import os
from importlib import reload
import pytest
from ..routers import auth, invite
from ..schemas.user import UserCreate
from ..schemas.invite import InviteCreate, InviteRedeem

from ..core import config
from ..core.db import init_db, get_session


@pytest.fixture(autouse=True)
def setup(tmp_path):
    os.environ["DATABASE_URL"] = f"sqlite:///{tmp_path}/test.db"
    reload(config)
    init_db()
    yield


def test_generate_redeem():
    db = next(get_session())
    auth.register(UserCreate(email="admin@test", password="pw", id_document="id"), db)
    db["users"]["admin@test"].role = "ADMIN"
    code = invite.generate_invite(
        InviteCreate(max_uses=1), admin=db["users"]["admin@test"], db=db
    )["code"]
    auth.register(UserCreate(email="u@test", password="pw", id_document="id"), db)
    user = db["users"]["u@test"]
    res = invite.redeem_invite(InviteRedeem(code=code), user=user, db=db)
    assert res["status"] == "redeemed"
