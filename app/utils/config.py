from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path
from typing import Any

import yaml
from pydantic import BaseModel, Field

from app.schemas.enums import PermissionLevel


class GovernanceConfig(BaseModel):
    invoice_amount_threshold: float = 10_000
    anomaly_threshold: float = 0.8
    margin_floor: float = 0.2
    sentiment_escalation_threshold: float = 0.75
    auto_approve_levels: list[PermissionLevel] = Field(
        default_factory=lambda: [
            PermissionLevel.L0_OBSERVE,
            PermissionLevel.L1_PROPOSE,
            PermissionLevel.L2_EXECUTE_LOW_RISK,
        ]
    )


class OrchestratorConfig(BaseModel):
    poll_interval_seconds: float = 0.5
    max_steps_per_event: int = 6


class DatabaseConfig(BaseModel):
    path: Path = Path(os.getenv("AI_ORCH_DB", "ai_orchestrator.db"))


class AppConfig(BaseModel):
    governance: GovernanceConfig = Field(default_factory=GovernanceConfig)
    orchestrator: OrchestratorConfig = Field(default_factory=OrchestratorConfig)
    database: DatabaseConfig = Field(default_factory=DatabaseConfig)



def _deep_update(base: dict[str, Any], override: dict[str, Any]) -> dict[str, Any]:
    for key, value in override.items():
        if isinstance(value, dict) and isinstance(base.get(key), dict):
            base[key] = _deep_update(base[key], value)
        else:
            base[key] = value
    return base


@lru_cache(maxsize=1)
def get_config(config_path: str | None = None) -> AppConfig:
    path = Path(config_path or os.getenv("AI_ORCH_CONFIG", "example_config.yaml"))
    if not path.exists():
        return AppConfig()
    with path.open("r", encoding="utf-8") as handle:
        data = yaml.safe_load(handle) or {}
    merged = _deep_update(AppConfig().model_dump(mode="python"), data)
    return AppConfig.model_validate(merged)
