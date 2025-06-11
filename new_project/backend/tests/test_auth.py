import os
import pytest
from ..routers import auth
from ..schemas.user import UserCreate, UserLogin

from importlib import reload

from ..core import config
from ..core.db import init_db, get_session


@pytest.fixture(autouse=True)
def setup(tmp_path):
    os.environ["DATABASE_URL"] = f"sqlite:///{tmp_path}/test.db"
    reload(config)
    init_db()
    yield


def test_register_and_login():
    db = next(get_session())
    token_obj = auth.register(
        UserCreate(email="a@test", password="pw", id_document="id"), db
    )
    assert token_obj.access_token
    token_obj2 = auth.login(UserLogin(email="a@test", password="pw"), db)
    assert token_obj2.access_token
