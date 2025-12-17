"""FastAPI application for RV-Loop Lab."""
from __future__ import annotations

import json
from datetime import datetime
from typing import Dict, List

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from .adapters import ConsoleAdapter
from .models import PlanCandidate, Run, SessionLocal, TwinState, dump_json, init_db
from .planner import Planner
from .quantum_sandbox import QuantumSandbox
from .security import verify
from .twin import DigitalTwinStore, format_twin_state

app = FastAPI(title="RV-Loop Lab")
templates = Jinja2Templates(directory="rvloop/templates")

init_db()
twin_store = DigitalTwinStore()
planner = Planner(QuantumSandbox())
adapter = ConsoleAdapter()


class TelemetryIn(BaseModel):
    timestamp: str
    source_id: str
    metrics: Dict[str, float]
    notes: str | None = None
    signature: str | None = Field(None, description="hex-encoded signature")


class RunOut(BaseModel):
    id: int
    created_at: str
    source_id: str
    telemetry: Dict[str, object]
    twin_before: Dict[str, object]
    twin_after: Dict[str, object]
    selected_plan: Dict[str, object]
    reasoning: str
    send_status: str
    candidates: List[Dict[str, object]]


# Dependency

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def process_telemetry(payload: Dict[str, object]):
    signature_hex = payload.pop("signature", None)
    if signature_hex:
        message_bytes = json.dumps(payload, sort_keys=True).encode()
        try:
            signature_bytes = bytes.fromhex(signature_hex)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid signature encoding")
        if not verify(message_bytes, signature_bytes):
            raise HTTPException(status_code=400, detail="Signature verification failed")

    timestamp = datetime.fromisoformat(str(payload["timestamp"]))
    metrics: Dict[str, float] = payload.get("metrics", {})
    source_id = str(payload["source_id"])

    twin_before, twin_after = twin_store.update_state(source_id, metrics, timestamp)
    evaluations, winner = planner.evaluate(twin_after, metrics)

    with SessionLocal() as session:
        run = Run(
            source_id=source_id,
            telemetry=payload,
            twin_before=twin_before,
            twin_after=twin_after,
            selected_plan=winner.plan.as_dict(),
            reasoning="highest score",
            send_status="pending",
        )
        session.add(run)
        session.flush()
        for ev in evaluations:
            session.add(
                PlanCandidate(
                    run_id=run.id,
                    name=ev.plan.name,
                    params=ev.plan.params,
                    score=ev.score,
                )
            )
        session.commit()
        session.refresh(run)
        # Load candidates before closing session
        _ = list(run.candidates)

        status = adapter.send_plan(source_id, winner.plan.as_dict())
        run.send_status = status
        session.add(run)
        session.commit()
        session.refresh(run)
        serialized = serialize_run(run)
    return serialized


@app.post("/telemetry", response_model=RunOut)
def ingest_telemetry(payload: TelemetryIn, db: Session = Depends(get_db)):
    run = process_telemetry(payload.model_dump())
    return run


@app.get("/runs", response_model=List[RunOut])
def list_runs(limit: int = 20, db: Session = Depends(get_db)):
    runs = db.query(Run).order_by(Run.created_at.desc()).limit(limit).all()
    return [serialize_run(r) for r in runs]


@app.get("/runs/{run_id}", response_model=RunOut)
def get_run(run_id: int, db: Session = Depends(get_db)):
    run = db.get(Run, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    return serialize_run(run)


@app.get("/twin/{source_id}")
def get_twin(source_id: str, db: Session = Depends(get_db)):
    state = db.get(TwinState, source_id)
    if not state:
        raise HTTPException(status_code=404, detail="Twin not found")
    return format_twin_state(state)


@app.get("/", response_class=HTMLResponse)
def dashboard(request: Request, db: Session = Depends(get_db)):
    runs = db.query(Run).order_by(Run.created_at.desc()).limit(20).all()
    latest_twin = db.query(TwinState).order_by(TwinState.updated_at.desc()).first()
    twin_snapshot = format_twin_state(latest_twin) if latest_twin else None
    return templates.TemplateResponse(
        "index.html",
        {
            "request": request,
            "runs": runs,
            "format": format_twin_state,
            "twin": twin_snapshot,
            "dump_json": dump_json,
        },
    )


def serialize_run(run: Run) -> RunOut:
    return RunOut(
        id=run.id,
        created_at=run.created_at.isoformat(),
        source_id=run.source_id,
        telemetry=run.telemetry,
        twin_before=run.twin_before,
        twin_after=run.twin_after,
        selected_plan=run.selected_plan,
        reasoning=run.reasoning,
        send_status=run.send_status,
        candidates=[
            {"name": c.name, "params": c.params, "score": c.score}
            for c in sorted(run.candidates, key=lambda c: c.id)
        ],
    )
