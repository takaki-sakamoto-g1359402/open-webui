import json
import os
import time
from collections import defaultdict, deque
from pathlib import Path
from typing import Deque, Dict, Tuple

from fastapi import FastAPI
from pydantic import BaseModel, Field

from edge.common.config import get_settings, site_topic


class TelemetryPayload(BaseModel):
    schema: str = Field(pattern=r"^telemetry\.v1\.")
    data: dict
    priority: str = Field(default="steady", pattern=r"^(steady|exception)$")


class UploadRequest(BaseModel):
    filename: str = Field(min_length=5)
    sha256: str = Field(min_length=32, max_length=64)
    size_bytes: int = Field(gt=0)


app = FastAPI(title="telemetry-gateway", version="0.1.0")
settings = get_settings()
_last_emit: Dict[Tuple[str, str], float] = defaultdict(float)
_metrics_window: Deque[int] = deque(maxlen=60)
_storage_path = Path(os.getenv("MCAP_PATH", "var/mcap"))
_storage_path.mkdir(parents=True, exist_ok=True)


def _should_emit(schema: str, stream_id: str, priority: str) -> bool:
    now = time.time()
    key = (schema, stream_id)
    interval = 1.0
    if schema.endswith("TaskMetric"):
        interval = 0.0
    elif schema.endswith("NetworkStat"):
        interval = 2.0
    if priority == "exception":
        return True
    last = _last_emit[key]
    if now - last >= interval:
        _last_emit[key] = now
        return True
    return False


def _write_record(record: dict) -> None:
    day_folder = _storage_path / time.strftime("%Y%m%d")
    day_folder.mkdir(parents=True, exist_ok=True)
    file_path = day_folder / f"telemetry-{int(time.time())}.jsonl"
    with file_path.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(record) + "\n")


@app.get("/healthz")
def healthz() -> Dict[str, str]:
    return {"status": "ok", "site": settings.site_id}


@app.post("/telemetry")
def ingest(payload: TelemetryPayload) -> Dict[str, str]:
    robot_id = payload.data.get("robot_id", "unknown")
    stream_id = payload.data.get("task_id", robot_id)
    if not _should_emit(payload.schema, stream_id, payload.priority):
        return {"status": "dropped", "reason": "sampling", "schema": payload.schema}
    record = {
        "received_at": time.time(),
        "schema": payload.schema,
        "data": payload.data,
        "priority": payload.priority,
        "topic": site_topic(f"telemetry/{payload.data.get('robot_id', 'unknown')}")
    }
    _write_record(record)
    _metrics_window.append(len(json.dumps(record)))
    return {"status": "stored", "schema": payload.schema}


@app.get("/metrics")
def metrics() -> Dict[str, float]:
    if not _metrics_window:
        return {"ingest_bps": 0.0}
    total_bytes = sum(_metrics_window)
    avg_bps = (total_bytes * 8) / max(len(_metrics_window), 1)
    return {"ingest_bps": round(avg_bps, 2)}


@app.put("/mcap/upload")
def upload(request: UploadRequest) -> Dict[str, str]:
    path = _storage_path / request.filename
    path.write_text("", encoding="utf-8")
    return {"status": "staged", "filename": request.filename}
