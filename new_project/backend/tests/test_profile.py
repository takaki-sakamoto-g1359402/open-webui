import os
from importlib import reload
import pytest
from ..routers import auth, profile
from ..schemas.user import UserCreate
from ..schemas.user import ProfileUpdate

from ..core import config
from ..core.db import init_db, get_session


@pytest.fixture(autouse=True)
def setup(tmp_path):
    os.environ["DATABASE_URL"] = f"sqlite:///{tmp_path}/test.db"
    reload(config)
    init_db()
    yield


def test_profile_crud():
    db = next(get_session())
    auth.register(UserCreate(email="p@test", password="pw", id_document="id"), db)
    user = db["users"]["p@test"]
    data = ProfileUpdate(preferred_lang="en", data={"en": "hello"})
    profile.update_profile("p@test", payload=data, user=user, db=db)
    res = profile.get_profile("p@test", lang="en", db=db)
    assert res["text"] == "hello"
