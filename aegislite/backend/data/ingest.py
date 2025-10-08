"""Simple ingestion utilities for CSV/JSON files."""
from __future__ import annotations

import csv
import json
from pathlib import Path
from typing import Iterable, Type, TypeVar

from pydantic import BaseModel
from sqlmodel import Session

from .models import Asset, Agent, GeoFence, Mission

T = TypeVar("T", bound=BaseModel)


def _load(path: Path) -> Iterable[dict]:
    if path.suffix == ".json":
        return json.loads(path.read_text())
    elif path.suffix == ".csv":
        return list(csv.DictReader(path.open()))
    else:
        raise ValueError(f"Unsupported file type: {path.suffix}")


def _ingest(session: Session, model: Type[SQLModel], schema: Type[T], data: Iterable[dict]):
    for item in data:
        validated = schema(**item)
        session.add(model(**validated.dict()))
    session.commit()


class AssetSchema(BaseModel):
    name: str
    type: str


class AgentSchema(BaseModel):
    name: str
    x: int
    y: int


class GeoFenceSchema(BaseModel):
    name: str
    allowed: bool
    x1: int
    y1: int
    x2: int
    y2: int


class MissionSchema(BaseModel):
    name: str
    sensitivity: int
    start_x: int
    start_y: int
    target_x: int
    target_y: int


def ingest_assets(session: Session, path: str):
    _ingest(session, Asset, AssetSchema, _load(Path(path)))


def ingest_agents(session: Session, path: str):
    _ingest(session, Agent, AgentSchema, _load(Path(path)))


def ingest_geofences(session: Session, path: str):
    _ingest(session, GeoFence, GeoFenceSchema, _load(Path(path)))


def ingest_missions(session: Session, path: str):
    _ingest(session, Mission, MissionSchema, _load(Path(path)))
