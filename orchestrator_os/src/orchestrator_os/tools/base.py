"""Base tool contract."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

from pydantic import BaseModel

from orchestrator_os.core.models import RiskTier, ToolCallResult


class Tool(ABC):
    name: str
    description: str
    risk_tier: RiskTier
    required_scopes: list[str]
    input_model: type[BaseModel]
    output_model: type[BaseModel]

    @abstractmethod
    def run(self, data: BaseModel) -> ToolCallResult:
        raise NotImplementedError

    def is_sandbox_safe(self, payload: dict[str, Any]) -> bool:
        return True
