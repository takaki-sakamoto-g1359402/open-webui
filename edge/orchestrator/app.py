import asyncio
import json
import time
from typing import Dict, Optional
from urllib.parse import urlparse

import httpx
import paho.mqtt.client as mqtt
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field, validator

from edge.common.config import get_settings, site_topic


class TimeWindow(BaseModel):
    start_after: Optional[str] = None
    finish_before: Optional[str] = None


class Constraints(BaseModel):
    zone: str = Field(min_length=1)
    speed_limit: float = Field(gt=0, le=2.0)
    time_window: Optional[TimeWindow] = None
    permit_class: Optional[str] = None


class Mission(BaseModel):
    type: str = Field(regex=r"^(navigation|manipulation)$")
    target: str = Field(min_length=1)


class KPITargets(BaseModel):
    latency_ms: int = Field(gt=0)
    near_miss_rate: float = Field(ge=0)


class TaskRequest(BaseModel):
    task_id: str = Field(min_length=3)
    robot_id: Optional[str] = None
    mission: Mission
    constraints: Constraints
    kpi_targets: KPITargets

    @validator("task_id")
    def validate_task_id(cls, value: str) -> str:
        if " " in value:
            raise ValueError("task_id must not contain spaces")
        return value


class TaskRecord(BaseModel):
    task: TaskRequest
    status: str
    permit_token: str
    created_at: float
    updated_at: float


app = FastAPI(title="edge-orchestrator", version="0.1.0")
settings = get_settings()
_tasks: Dict[str, TaskRecord] = {}
_mqtt_client: Optional[mqtt.Client] = None


async def get_mqtt_client() -> mqtt.Client:
    global _mqtt_client
    if _mqtt_client is not None:
        return _mqtt_client
    parsed = urlparse(str(settings.mqtt_url))
    client = mqtt.Client()
    event = asyncio.Event()

    def on_connect(_client, _userdata, _flags, rc):
        if rc == 0:
            event.set()

    client.on_connect = on_connect
    client.loop_start()
    port = parsed.port or 1883
    client.connect(parsed.hostname or "localhost", port)
    try:
        await asyncio.wait_for(event.wait(), timeout=5)
    except asyncio.TimeoutError as exc:  # pragma: no cover
        client.loop_stop()
        raise HTTPException(status_code=503, detail="MQTT broker unavailable") from exc
    _mqtt_client = client
    return client


async def request_permit(payload: TaskRequest) -> str:
    url = "http://safety-policy-service:8083/permits"
    async with httpx.AsyncClient(timeout=3.0) as client:
        response = await client.post(url, json={
            "task_id": payload.task_id,
            "mission": payload.mission.dict(),
            "constraints": payload.constraints.dict(),
            "kpi_targets": payload.kpi_targets.dict(),
        })
    if response.status_code == 200:
        body = response.json()
        token = body.get("permit_token")
        if not token:
            raise HTTPException(status_code=500, detail="Permit response missing token")
        return token
    if response.status_code == 403:
        raise HTTPException(status_code=403, detail=response.json().get("detail", "Permit denied"))
    raise HTTPException(status_code=503, detail="Safety policy unavailable")


async def publish_task(task: TaskRequest, permit_token: str) -> None:
    client = await get_mqtt_client()
    message = {
        "header": {
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "version": "2.0",
            "manufacturer": "edge-box"
        },
        "state": {
            "orderId": task.task_id,
            "zoneSetId": task.constraints.zone,
            "actionId": f"{task.mission.type}-{task.task_id}",
            "nodeId": task.mission.target,
            "sequenceId": int(time.time() * 1000) % 100000,
            "blocking": False
        },
        "actions": [
            {
                "actionType": task.mission.type,
                "actionId": f"{task.mission.type}-{task.task_id}",
                "parameters": [
                    {"key": "target", "value": task.mission.target},
                    {"key": "speedLimit", "value": str(task.constraints.speed_limit)},
                    {"key": "safetyToken", "value": permit_token}
                ]
            }
        ]
    }
    topic = site_topic("command/vda5050")
    payload = json.dumps(message)
    result = await asyncio.to_thread(client.publish, topic, payload, qos=1)
    if result.rc != mqtt.MQTT_ERR_SUCCESS:
        raise HTTPException(status_code=503, detail="Failed to publish command")


@app.get("/healthz")
async def healthz() -> Dict[str, str]:
    return {"status": "ok", "site": settings.site_id}


@app.post("/tasks", response_model=TaskRecord)
async def create_task(task: TaskRequest) -> TaskRecord:
    if task.task_id in _tasks:
        raise HTTPException(status_code=409, detail="task_id already exists")
    permit_token = await request_permit(task)
    await publish_task(task, permit_token)
    timestamp = time.time()
    record = TaskRecord(task=task, status="PENDING", permit_token=permit_token, created_at=timestamp, updated_at=timestamp)
    _tasks[task.task_id] = record
    return record


@app.get("/tasks")
async def list_tasks() -> Dict[str, TaskRecord]:
    return _tasks


@app.post("/tasks/{task_id}/complete")
async def complete_task(task_id: str) -> TaskRecord:
    record = _tasks.get(task_id)
    if not record:
        raise HTTPException(status_code=404, detail="Task not found")
    record.status = "COMPLETED"
    record.updated_at = time.time()
    _tasks[task_id] = record
    return record
