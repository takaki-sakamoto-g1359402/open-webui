import os
from importlib import reload

import pytest
from ..routers import auth, profile
from ..schemas.user import UserCreate, ProfileUpdate

from ..core import config
from ..core.db import init_db, get_session


@pytest.fixture(autouse=True)
def setup(tmp_path):
    os.environ["DATABASE_URL"] = f"sqlite:///{tmp_path}/test.db"
    reload(config)
    init_db()
    yield


def test_register_to_profile():
    db = next(get_session())
    auth.register(UserCreate(email="e2e@test", password="pw", id_document="id"), db)
    user = db["users"]["e2e@test"]
    data = ProfileUpdate(preferred_lang="en", data={"en": "hello"})
    profile.update_profile("e2e@test", payload=data, user=user, db=db)
    got = profile.get_profile("e2e@test", lang="en", db=db)
    assert got["text"] == "hello"
