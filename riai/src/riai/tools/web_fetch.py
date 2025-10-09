"""HTTP GET tool with safety checks."""
from __future__ import annotations

import urllib.request
from typing import Any

from . import BaseTool, ToolError, ToolResult


class WebFetchTool(BaseTool):
    name = "web_fetch"
    description = "Fetch web pages from an allowlisted domain"

    def run(self, url: str, **_: Any) -> ToolResult:
        self.safety.ensure_web_allowed(url)
        try:
            with urllib.request.urlopen(url, timeout=self.safety.policy.web_timeout) as response:
                data = response.read(self.safety.policy.web_max_content_length)
        except Exception as exc:  # pragma: no cover - requires network
            raise ToolError(str(exc)) from exc
        try:
            text = data.decode("utf-8")
        except UnicodeDecodeError:
            text = data.decode("utf-8", errors="ignore")
        return ToolResult(success=True, output=text)

