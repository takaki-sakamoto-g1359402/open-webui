"""Deterministic browser stub for offline evaluation."""
from __future__ import annotations

from typing import Any

from . import BaseTool, ToolResult


class BrowserStubTool(BaseTool):
    name = "browser_stub"
    description = "Mock browser returning deterministic content"

    def run(self, url: str | None = None, **_: Any) -> ToolResult:
        page = {
            "url": url or "about:blank",
            "title": "Riai Browser Stub",
            "body": "This is a deterministic offline browser stub.",
        }
        return ToolResult(success=True, output=str(page), metadata=page)

