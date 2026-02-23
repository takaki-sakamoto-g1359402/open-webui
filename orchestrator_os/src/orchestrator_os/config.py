"""Runtime configuration for Orchestrator OS."""

from __future__ import annotations

import os
from pathlib import Path

from pydantic import BaseModel, Field


class Settings(BaseModel):
    workspace_dir: Path = Field(default_factory=lambda: Path("./workspace"))
    db_path: Path = Field(default_factory=lambda: Path("./workspace/.db/orchestrator.db"))
    orchestrator_disabled: bool = False
    enable_web_fetch: bool = False
    openai_api_key: str | None = None
    filesystem_max_bytes: int = 1_000_000


_cached: Settings | None = None


def _to_bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def get_settings() -> Settings:
    global _cached
    if _cached is None:
        _cached = Settings(
            workspace_dir=Path(os.getenv("ORCHESTRATOR_WORKSPACE", "./workspace")),
            db_path=Path(os.getenv("ORCHESTRATOR_DB_PATH", "./workspace/.db/orchestrator.db")),
            orchestrator_disabled=_to_bool(os.getenv("ORCHESTRATOR_DISABLED"), False),
            enable_web_fetch=_to_bool(os.getenv("ENABLE_WEB_FETCH"), False),
            openai_api_key=os.getenv("OPENAI_API_KEY"),
        )
    return _cached
