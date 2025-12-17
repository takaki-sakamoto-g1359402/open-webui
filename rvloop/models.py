"""Database models for RV-Loop Lab."""
from __future__ import annotations

import json
import os
from datetime import datetime
from typing import Any, Dict, Optional

from sqlalchemy import JSON, Column, DateTime, Float, ForeignKey, Integer, String, Text, create_engine
from sqlalchemy.orm import declarative_base, relationship, sessionmaker

SQLALCHEMY_DATABASE_URL = os.getenv("RVLOOP_DB", "sqlite:///rvloop.db")

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}, future=True, echo=False
)
SessionLocal = sessionmaker(
    bind=engine, autocommit=False, autoflush=False, expire_on_commit=False, future=True
)

Base = declarative_base()


def _json_column(default: Any) -> Column[Any]:
    return Column(JSON, default=default)


class TwinState(Base):
    __tablename__ = "twin_states"

    source_id: str = Column(String, primary_key=True, index=True)
    metrics: Dict[str, Any] = _json_column(dict)
    rolling_stats: Dict[str, Any] = _json_column(dict)
    counts: Dict[str, int] = _json_column(dict)
    updated_at: datetime = Column(DateTime, default=datetime.utcnow, nullable=False)

    def snapshot(self) -> Dict[str, Any]:
        return {
            "source_id": self.source_id,
            "metrics": dict(self.metrics),
            "rolling_stats": dict(self.rolling_stats),
            "counts": dict(self.counts),
            "updated_at": self.updated_at.isoformat(),
        }


class Run(Base):
    __tablename__ = "runs"

    id: int = Column(Integer, primary_key=True, index=True)
    created_at: datetime = Column(DateTime, default=datetime.utcnow, nullable=False)
    source_id: str = Column(String, nullable=False)
    telemetry: Dict[str, Any] = _json_column(dict)
    twin_before: Dict[str, Any] = _json_column(dict)
    twin_after: Dict[str, Any] = _json_column(dict)
    selected_plan: Dict[str, Any] = _json_column(dict)
    reasoning: str = Column(Text, default="")
    send_status: str = Column(String, default="pending")

    candidates = relationship("PlanCandidate", back_populates="run", cascade="all, delete-orphan")


class PlanCandidate(Base):
    __tablename__ = "plan_candidates"

    id: int = Column(Integer, primary_key=True, index=True)
    run_id: int = Column(Integer, ForeignKey("runs.id"), nullable=False)
    name: str = Column(String, nullable=False)
    params: Dict[str, Any] = _json_column(dict)
    score: float = Column(Float, nullable=False, default=0.0)

    run = relationship("Run", back_populates="candidates")


def init_db() -> None:
    Base.metadata.create_all(bind=engine)


def serialize_datetime(dt: Optional[datetime]) -> Optional[str]:
    return dt.isoformat() if dt else None


def to_plain_dict(obj: Any) -> Any:
    if isinstance(obj, datetime):
        return serialize_datetime(obj)
    if isinstance(obj, dict):
        return {k: to_plain_dict(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [to_plain_dict(v) for v in obj]
    return obj


def dump_json(obj: Any) -> str:
    return json.dumps(to_plain_dict(obj), indent=2)
