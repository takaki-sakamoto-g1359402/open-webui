from fastapi.testclient import TestClient

from humane_orchestrator.app.main import app

client = TestClient(app)


def test_register_and_evaluate_proposal():
    tool_payload = {
        "id": "tool-api-1",
        "name": "Persuader",
        "description": "",
        "capabilities": [
            {"id": "c1", "name": "Mass Persuasion", "description": ""},
        ],
        "risks": [],
    }
    resp = client.post("/tools", json=tool_payload)
    assert resp.status_code == 200

    proposal_payload = {
        "id": "prop-api-1",
        "title": "Campaign outreach",
        "description": "",
        "tool_id": "tool-api-1",
        "intended_audience": "voters",
        "context": "Political campaign",
    }
    resp = client.post("/proposals", json=proposal_payload)
    assert resp.status_code == 200

    resp = client.post(f"/proposals/{proposal_payload['id']}/evaluate")
    assert resp.status_code == 200
    data = resp.json()
    assert data["warnings"]
    assert not data["passed"]

    resp = client.get(f"/evaluations/{proposal_payload['id']}")
    assert resp.status_code == 200


def test_list_principles():
    resp = client.get("/principles")
    assert resp.status_code == 200
    assert len(resp.json()) >= 1

