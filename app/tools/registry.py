from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Awaitable, Callable

from app.schemas.enums import PermissionLevel
from app.schemas.models import ToolCallContext, ToolResult

ToolCallable = Callable[[ToolCallContext, dict[str, Any]], Awaitable[ToolResult]]
RollbackCallable = Callable[[ToolCallContext, dict[str, Any], dict[str, Any]], Awaitable[None]]


@dataclass(slots=True)
class ToolDefinition:
    name: str
    description: str
    required_level: PermissionLevel
    handler: ToolCallable
    rollback_handler: RollbackCallable | None = None
    tags: set[str] = field(default_factory=set)


@dataclass(slots=True)
class ToolRegistry:
    tools: dict[str, ToolDefinition] = field(default_factory=dict)

    def register(self, definition: ToolDefinition) -> None:
        self.tools[definition.name] = definition

    def get(self, name: str) -> ToolDefinition:
        if name not in self.tools:
            raise KeyError(f"tool '{name}' is not registered")
        return self.tools[name]

    def list_tools(self) -> list[ToolDefinition]:
        return list(self.tools.values())
