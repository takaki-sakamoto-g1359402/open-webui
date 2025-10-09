"""Allowlisted shell command executor."""
from __future__ import annotations

import subprocess
from typing import Any

from . import BaseTool, ToolError, ToolResult


class ShellTool(BaseTool):
    name = "shell"
    description = "Execute allowlisted shell commands"

    def run(self, command: str, timeout: int | None = None, **_: Any) -> ToolResult:
        self.safety.check_shell_command(command)
        try:
            completed = subprocess.run(
                command,
                shell=True,
                capture_output=True,
                text=True,
                timeout=timeout or 5,
                check=False,
            )
        except subprocess.TimeoutExpired as exc:  # pragma: no cover - rare
            raise ToolError(f"Command timed out: {command}") from exc
        output = completed.stdout.strip()
        if completed.returncode != 0:
            raise ToolError(completed.stderr.strip() or f"Command failed: {command}")
        return ToolResult(success=True, output=output)

