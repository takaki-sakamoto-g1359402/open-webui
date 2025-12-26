"""FastAPI app exposing minimal OpenUSD editing operations."""

from __future__ import annotations

from pathlib import Path
from typing import Dict, List, Optional

from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel, Field

from . import usd_ops

app = FastAPI(title="OpenUSD Bridge API", version="0.1.0")


class LoadRequest(BaseModel):
    path: str = Field(..., description="Path to a USD stage on disk")


class XformRequest(BaseModel):
    prim_path: str
    translate: Optional[List[float]] = Field(default=None, min_items=3, max_items=3)
    rotate: Optional[List[float]] = Field(default=None, min_items=3, max_items=3)
    scale: Optional[List[float]] = Field(default=None, min_items=3, max_items=3)


class AddPrimRequest(BaseModel):
    prim_path: str
    prim_type: str = Field(default="Cube")


class SaveRequest(BaseModel):
    path: str
    format: str = Field(default="usda")


def _get_stage(stage_id: str):
    try:
        return usd_ops.stage_store.get(stage_id)
    except KeyError as exc:  # pragma: no cover - defensive
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.post("/stage/load")
def load_stage(request: LoadRequest) -> Dict[str, str]:
    try:
        stage = usd_ops.load_stage(request.path)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:  # pragma: no cover - failure path
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    stage_id = usd_ops.stage_store.add(stage)
    return {"stage_id": stage_id}


@app.get("/stage/{stage_id}/prims")
def list_stage_prims(stage_id: str) -> Dict[str, List[Dict[str, str]]]:
    stage = _get_stage(stage_id)
    return {"prims": usd_ops.list_prims(stage)}


@app.get("/stage/{stage_id}/xform")
def read_xform(stage_id: str, prim_path: str = Query(..., description="Absolute prim path")) -> Dict[str, object]:
    stage = _get_stage(stage_id)
    try:
        return usd_ops.get_xform(stage, prim_path)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/stage/{stage_id}/xform")
def write_xform(stage_id: str, request: XformRequest) -> Dict[str, str]:
    stage = _get_stage(stage_id)
    try:
        usd_ops.set_xform(
            stage,
            request.prim_path,
            translate=tuple(request.translate) if request.translate else None,
            rotate=tuple(request.rotate) if request.rotate else None,
            scale=tuple(request.scale) if request.scale else None,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"status": "ok"}


@app.post("/stage/{stage_id}/add_prim")
def add_prim(stage_id: str, request: AddPrimRequest) -> Dict[str, str]:
    stage = _get_stage(stage_id)
    try:
        prim = usd_ops.add_primitive(stage, request.prim_path, request.prim_type)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"prim": prim.GetPath().pathString}


@app.post("/stage/{stage_id}/save")
def save_stage(stage_id: str, request: SaveRequest) -> Dict[str, str]:
    stage = _get_stage(stage_id)
    try:
        saved_path = usd_ops.save_stage(stage, request.path, request.format)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return {"saved_path": Path(saved_path).as_posix()}
