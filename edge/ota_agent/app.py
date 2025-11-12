import time
from typing import Dict

import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from edge.common.config import get_settings


class StageRequest(BaseModel):
    version: str = Field(min_length=1)
    ring: str = Field(pattern=r"^(RING_CANARY|RING_PILOT|RING_MAIN)$")
    package_url: str
    sha256: str = Field(min_length=32, max_length=64)


class HealthStatus(BaseModel):
    version: str
    state: str
    updated_at: float


app = FastAPI(title="ota-agent", version="0.1.0")
settings = get_settings()
_updates: Dict[str, HealthStatus] = {}
_current_version = "v1.0.0"


async def _notify_orchestrator(version: str, state: str) -> None:
    url = "http://orchestrator:8080/healthz"
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            await client.get(url)
    except httpx.HTTPError as exc:  # pragma: no cover
        raise HTTPException(status_code=503, detail="Orchestrator not reachable") from exc


@app.get("/healthz")
async def healthz() -> Dict[str, str]:
    return {"status": "ok", "site": settings.site_id, "current_version": _current_version}


@app.post("/updates/stage")
async def stage_update(request: StageRequest) -> HealthStatus:
    if request.version in _updates:
        raise HTTPException(status_code=409, detail="Version already staged")
    status = HealthStatus(version=request.version, state="STAGED", updated_at=time.time())
    _updates[request.version] = status
    await _notify_orchestrator(request.version, status.state)
    return status


@app.post("/updates/{version}/promote")
async def promote(version: str) -> HealthStatus:
    status = _updates.get(version)
    if not status:
        raise HTTPException(status_code=404, detail="Version not staged")
    status.state = "ACTIVE"
    status.updated_at = time.time()
    global _current_version
    _current_version = version
    await _notify_orchestrator(version, status.state)
    return status


@app.post("/updates/{version}/rollback")
async def rollback(version: str) -> HealthStatus:
    status = _updates.get(version)
    if not status:
        raise HTTPException(status_code=404, detail="Version not staged")
    status.state = "ROLLED_BACK"
    status.updated_at = time.time()
    await _notify_orchestrator(version, status.state)
    global _current_version
    _current_version = "v1.0.0"
    return status
