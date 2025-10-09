"""Tool interface and registry."""
from __future__ import annotations

import importlib
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional

import yaml

from ..safety import SafetyGuard, SafetyViolation


class ToolError(RuntimeError):
    """Raised when a tool fails to execute."""


@dataclass
class ToolResult:
    success: bool
    output: str
    artifacts: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)


class BaseTool:
    """Interface for all tools."""

    name: str = "tool"
    description: str = ""

    def __init__(self, safety: SafetyGuard) -> None:
        self.safety = safety

    def run(self, **kwargs: Any) -> ToolResult:  # pragma: no cover - implemented in subclasses
        raise NotImplementedError

    def describe(self) -> Dict[str, Any]:
        return {"name": self.name, "description": self.description, "class": self.__class__.__name__}


class ToolRegistry:
    """Registry for managing tools."""

    def __init__(self, safety: SafetyGuard) -> None:
        self._safety = safety
        self._tools: Dict[str, BaseTool] = {}
        self._available: Dict[str, Dict[str, str]] = {}
        self._enabled: set[str] = set()

    def register_available(self, name: str, module: str, cls: str) -> None:
        self._available[name] = {"module": module, "class": cls}

    def enable(self, name: str) -> None:
        if name not in self._available:
            raise ToolError(f"Unknown tool '{name}'")
        if name in self._tools:
            self._enabled.add(name)
            return
        module = importlib.import_module(self._available[name]["module"])
        cls = getattr(module, self._available[name]["class"])
        tool: BaseTool = cls(self._safety)
        self._tools[name] = tool
        self._enabled.add(name)

    def disable(self, name: str) -> None:
        self._enabled.discard(name)

    def is_enabled(self, name: str) -> bool:
        return name in self._enabled

    def list_enabled(self) -> Iterable[str]:
        return sorted(self._enabled)

    def get(self, name: str) -> BaseTool:
        if name not in self._tools:
            raise ToolError(f"Tool '{name}' is not loaded")
        return self._tools[name]

    def describe(self) -> Dict[str, Any]:
        return {
            "enabled": list(self.list_enabled()),
            "available": self._available,
        }

    def run(self, name: str, **kwargs: Any) -> ToolResult:
        if not self.is_enabled(name):
            raise ToolError(f"Tool '{name}' is not enabled")
        tool = self.get(name)
        return tool.run(**kwargs)


def registry_from_config(path: Path, safety: SafetyGuard) -> ToolRegistry:
    data = yaml.safe_load(path.read_text())
    registry = ToolRegistry(safety)
    for name, spec in data.get("available_tools", {}).items():
        registry.register_available(name, spec["module"], spec["class"])
    for name in data.get("default_tools", []):
        try:
            registry.enable(name)
        except (ToolError, SafetyViolation):
            continue
    return registry

