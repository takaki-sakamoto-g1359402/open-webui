import importlib
import json
import os
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

sys.path.append(str(Path(__file__).resolve().parents[1]))


def test_security_sign_verify():
    from rvloop import security

    message = b"hello"
    signature = security.sign(message)
    assert security.verify(message, signature)
    assert not security.verify(message, b"bad")


def test_quantum_sandbox_toggle():
    from rvloop.quantum_sandbox import QuantumSandbox

    disabled = QuantumSandbox(enabled=False)
    assert disabled.epsilon() == 0.0

    enabled = QuantumSandbox(enabled=True)
    value = enabled.epsilon()
    assert 0.0 <= value < 0.01


def test_api_loop(tmp_path: Path, monkeypatch):
    monkeypatch.setenv("RVLOOP_DB", f"sqlite:///{tmp_path/'rvloop.db'}")

    # Reload modules to honor DB override
    import rvloop.models as models
    importlib.reload(models)
    models.init_db()
    import rvloop.api as api
    importlib.reload(api)

    client = TestClient(api.app)

    payload = {
        "timestamp": "2024-01-01T00:00:00",
        "source_id": "test-source",
        "metrics": {"temperature": 21.5},
        "notes": "pytest",
    }

    resp = client.post("/telemetry", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["selected_plan"]["name"] in {"hold", "increase_sampling", "decrease_sampling"}

    runs = client.get("/runs").json()
    assert len(runs) >= 1

    twin = client.get("/twin/test-source").json()
    assert twin["metrics"]["temperature"] == 21.5
