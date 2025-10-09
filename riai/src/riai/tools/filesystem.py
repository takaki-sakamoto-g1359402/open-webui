"""Read-only filesystem tool."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from . import BaseTool, ToolError, ToolResult


class FilesystemTool(BaseTool):
    name = "filesystem"
    description = "Read-only access to sandboxed filesystem"

    def run(self, action: str, path: str = ".", max_bytes: int | None = None, **_: Any) -> ToolResult:
        if action not in {"list", "read_text"}:
            raise ToolError(f"Unsupported action '{action}'")
        sandbox_path = self.safety.ensure_filesystem_path(Path(path), for_write=False)
        max_bytes = max_bytes or self.safety.policy.filesystem_max_read_bytes
        if action == "list":
            if not sandbox_path.exists():
                raise ToolError(f"Path '{sandbox_path}' does not exist")
            if not sandbox_path.is_dir():
                raise ToolError("List action requires a directory")
            entries = sorted(p.name for p in sandbox_path.iterdir())
            return ToolResult(success=True, output=json.dumps(entries))
        if not sandbox_path.exists():
            raise ToolError(f"File '{sandbox_path}' not found")
        if sandbox_path.is_dir():
            raise ToolError("Cannot read directory as text")
        data = sandbox_path.read_bytes()[:max_bytes]
        try:
            output = data.decode("utf-8")
        except UnicodeDecodeError:
            output = data.decode("utf-8", errors="ignore")
        return ToolResult(success=True, output=output)

