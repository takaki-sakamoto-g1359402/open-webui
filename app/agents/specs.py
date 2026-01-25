from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable

from app.schemas.common import PermissionLevel

AgentHandler = Callable[[dict[str, Any]], dict[str, Any]]


@dataclass
class AgentSpec:
    agent_id: str
    name: str
    role: str
    allowed_tools: set[str]
    default_permission: PermissionLevel
    assist_only: bool = False
    handler: AgentHandler | None = None
    guidelines: list[str] = field(default_factory=list)

    def run(self, task: dict[str, Any]) -> dict[str, Any]:
        if self.handler is None:
            return {
                "agent_id": self.agent_id,
                "status": "no_handler",
                "task": task,
                "evidence": [],
                "uncertainty": "handler_missing",
            }
        result = self.handler(task)
        result.setdefault("agent_id", self.agent_id)
        result.setdefault("evidence", task.get("evidence_refs", []))
        result.setdefault("uncertainty", "low")
        if self.assist_only:
            result.setdefault("assist_only_notice", "AI3 provides assistance only; no legal conclusions.")
        return result
