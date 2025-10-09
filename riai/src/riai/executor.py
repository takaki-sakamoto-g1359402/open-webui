"""Tool execution layer."""
from __future__ import annotations

from typing import Iterable, Optional

from .safety import SafetyGuard, SafetyViolation
from .tools import ToolError, ToolRegistry
from .utils.logging import get_logger
from .utils.types import Observation, Step


class Executor:
    """Executes plan steps through tools."""

    def __init__(self, registry: ToolRegistry, safety: SafetyGuard, logger_name: str = "riai.executor") -> None:
        self.registry = registry
        self.safety = safety
        self.logger = get_logger(logger_name)

    def execute(self, step: Step) -> Observation:
        if step.tool is None:
            return Observation(step_id=step.id, success=True, output="No tool execution required")
        self.safety.ensure_tool_allowed(step.tool, self.registry.list_enabled())
        try:
            result = self.registry.run(step.tool, **step.inputs)
        except SafetyViolation as violation:
            self.logger.warning("Safety violation", extra={"step": step.id, "reason": violation.reason})
            return Observation(step_id=step.id, success=False, output="", error=violation.reason)
        except ToolError as error:
            self.logger.warning("Tool error", extra={"step": step.id, "error": str(error)})
            return Observation(step_id=step.id, success=False, output="", error=str(error))
        self.logger.info("Executed tool", extra={"step": step.id, "tool": step.tool})
        return Observation(step_id=step.id, success=result.success, output=result.output, artifacts=result.artifacts)

