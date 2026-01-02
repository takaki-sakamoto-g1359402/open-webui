from __future__ import annotations

import pytest
import requests

from ugw.authz.opa import OPAClient, validate_path


def test_validate_path_accepts_api_prefix():
    validate_path("/api/rooms")


def test_validate_path_rejects_unknown():
    with pytest.raises(ValueError):
        validate_path("/admin")


def test_opa_decision_parsing(monkeypatch):
    class DummyResponse:
        def __init__(self):
            self.status_code = 200

        def raise_for_status(self):
            return None

        def json(self):
            return {"result": {"allow": True}}

    def fake_post(*args, **kwargs):
        return DummyResponse()

    monkeypatch.setattr(requests, "post", fake_post)
    client = OPAClient(base_url="http://opa")
    decision = client.evaluate({"action": "room:create"})
    assert decision["result"]["allow"] is True
