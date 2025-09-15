from fastapi.testclient import TestClient
from sqlmodel import SQLModel, Session

from aegislite.backend.app import app
from aegislite.backend.deps import engine
from aegislite.backend.auth.models import User
from aegislite.backend.data.models import Mission


def setup_db():
    SQLModel.metadata.drop_all(engine)
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        session.add(User(username="op", role="operator", org="ops"))
        mission = Mission(name="m", sensitivity=1, start_x=0, start_y=0, target_x=2, target_y=0)
        session.add(mission)
        session.commit()
        return mission.id


def test_plan_approve_audit():
    mission_id = setup_db()
    client = TestClient(app)
    headers = {"X-User": "op"}
    r = client.post(f"/missions/plan/{mission_id}", headers=headers)
    assert r.status_code == 200
    r = client.post(f"/missions/approve/{mission_id}", headers=headers)
    assert r.status_code == 200
    logs = client.get("/audit", headers=headers).json()
    assert len(logs) >= 2
    actions = [log["action"] for log in logs]
    assert "POST" in actions
