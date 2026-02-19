"""Tool registry and schema-aware validation."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from pydantic import BaseModel, ValidationError

from orchestrator_os.core.models import RiskTier


@dataclass
class ToolSpec:
    name: str
    description: str
    input_model: type[BaseModel]
    output_model: type[BaseModel]
    risk_tier: RiskTier
    required_scopes: list[str]
    impl: Any


class ToolRegistry:
    def __init__(self) -> None:
        self._tools: dict[str, ToolSpec] = {}

    def register(self, spec: ToolSpec) -> None:
        self._tools[spec.name] = spec

    def get(self, name: str) -> ToolSpec:
        if name not in self._tools:
            raise KeyError(f"Tool not found: {name}")
        return self._tools[name]

    def list(self) -> list[ToolSpec]:
        return list(self._tools.values())

    def validate_input(self, tool_name: str, payload: dict[str, Any]) -> BaseModel:
        spec = self.get(tool_name)
        try:
            return spec.input_model.model_validate(payload)
        except ValidationError as exc:
            raise ValueError(f"Invalid tool input for {tool_name}: {exc}") from exc
