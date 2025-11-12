import subprocess
import time
from pathlib import Path
import shutil

import httpx
import pytest

if not shutil.which("docker") and not shutil.which("docker-compose"):
    pytest.skip("Docker runtime is required for integration test", allow_module_level=True)

ROOT = Path(__file__).resolve().parents[2]
COMPOSE_BASE = ["docker-compose"] if shutil.which("docker-compose") else ["docker", "compose"]
COMPOSE = COMPOSE_BASE + ["up", "-d", "--build"]
DOWN = COMPOSE_BASE + ["down"]

def wait_for(url: str, timeout: float = 60.0) -> None:
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            response = httpx.get(url, timeout=2.0)
            if response.status_code == 200:
                return
        except httpx.HTTPError:
            pass
        time.sleep(2)
    raise RuntimeError(f"Service at {url} did not become ready")


@pytest.fixture(scope="session", autouse=True)
def compose_stack():
    subprocess.run(COMPOSE, cwd=ROOT, check=True)
    try:
        wait_for("http://localhost:8083/healthz")
        wait_for("http://localhost:8080/healthz")
        wait_for("http://localhost:8081/healthz")
        wait_for("http://localhost:8082/healthz")
        yield
    finally:
        subprocess.run(DOWN, cwd=ROOT, check=False)


def test_basic_task_flow():
    task_payload = {
        "task_id": "task-001",
        "mission": {"type": "navigation", "target": "dock-A"},
        "constraints": {
            "zone": "Z-Alpha",
            "speed_limit": 1.0,
            "time_window": {"start_after": "2025-05-01T12:00:00Z", "finish_before": "2025-05-01T12:10:00Z"}
        },
        "kpi_targets": {"latency_ms": 5000, "near_miss_rate": 0.0001}
    }
    response = httpx.post("http://localhost:8080/tasks", json=task_payload, timeout=5.0)
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["status"] == "PENDING"

    telemetry = {
        "schema": "telemetry.v1.RobotState",
        "data": {
            "robot_id": "R-1234",
            "pose": {"x": 0, "y": 0, "theta": 0},
            "battery": 95,
            "mode": "AUTO",
            "safety_token": body["permit_token"],
            "timestamp": "2025-05-01T12:00:00Z"
        }
    }
    telem_response = httpx.post("http://localhost:8081/telemetry", json=telemetry, timeout=5.0)
    assert telem_response.status_code == 200
    metrics = httpx.get("http://localhost:8081/metrics", timeout=5.0)
    assert metrics.status_code == 200
    assert "ingest_bps" in metrics.json()

    stage_request = {
        "version": "v1.0.1",
        "ring": "RING_CANARY",
        "package_url": "https://example.com/pkg.tar",
        "sha256": "a" * 32
    }
    stage_resp = httpx.post("http://localhost:8082/updates/stage", json=stage_request, timeout=5.0)
    assert stage_resp.status_code == 200
    promote_resp = httpx.post("http://localhost:8082/updates/v1.0.1/promote", timeout=5.0)
    assert promote_resp.status_code == 200
    assert promote_resp.json()["state"] == "ACTIVE"
