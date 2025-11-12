import secrets
import time
from typing import Dict, List

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from edge.common.config import get_settings


ALLOWED_ZONES = {"Z-Alpha", "Z-Beta"}
MAX_SPEED = 1.5
CERTIFIED_PERMITS = {"HAZMAT": {"robots": {"R-HAZ-1"}}}


class Mission(BaseModel):
    type: str
    target: str


class Constraints(BaseModel):
    zone: str
    speed_limit: float
    time_window: dict | None = None
    permit_class: str | None = None


class KPITargets(BaseModel):
    latency_ms: int
    near_miss_rate: float


class PermitRequest(BaseModel):
    task_id: str
    mission: Mission
    constraints: Constraints
    kpi_targets: KPITargets


class PermitResponse(BaseModel):
    permit_token: str
    expires_at: float


class ThrottleRequest(BaseModel):
    robot_id: str
    zone: str
    human_distance_m: float


class ThrottleResponse(BaseModel):
    speed_limit: float
    reason: str


app = FastAPI(title="safety-policy-service", version="0.1.0")
settings = get_settings()


def _check_zone(constraints: Constraints, robot_id: str | None) -> None:
    if constraints.zone not in ALLOWED_ZONES:
        raise HTTPException(status_code=403, detail="Zone not permitted")
    permit_class = constraints.permit_class
    if permit_class and permit_class in CERTIFIED_PERMITS:
        allowed = CERTIFIED_PERMITS[permit_class]["robots"]
        if not robot_id or robot_id not in allowed:
            raise HTTPException(status_code=403, detail="Robot lacks certification")


def _check_speed(speed_limit: float) -> None:
    if speed_limit > MAX_SPEED:
        raise HTTPException(status_code=403, detail="Speed exceeds limit")


@app.get("/healthz")
def healthz() -> Dict[str, str]:
    return {"status": "ok", "site": settings.site_id}


@app.get("/policies")
def policies() -> Dict[str, List[str]]:
    return {"allowed_zones": sorted(ALLOWED_ZONES), "max_speed_mps": [MAX_SPEED]}


@app.post("/permits", response_model=PermitResponse)
def permits(request: PermitRequest) -> PermitResponse:
    _check_zone(request.constraints, request.mission.target if request.mission.target.startswith("R-") else None)
    _check_speed(request.constraints.speed_limit)
    if request.kpi_targets.near_miss_rate > 0.001:
        raise HTTPException(status_code=403, detail="KPI near miss target too high")
    token = secrets.token_urlsafe(16)
    return PermitResponse(permit_token=token, expires_at=time.time() + 3600)


@app.post("/throttles", response_model=ThrottleResponse)
def throttles(request: ThrottleRequest) -> ThrottleResponse:
    if request.zone not in ALLOWED_ZONES:
        raise HTTPException(status_code=403, detail="Zone not permitted")
    base_speed = min(MAX_SPEED, 1.0)
    if request.human_distance_m < 2.0:
        speed = 0.5
        reason = "human_nearby"
    else:
        speed = base_speed
        reason = "nominal"
    return ThrottleResponse(speed_limit=speed, reason=reason)
