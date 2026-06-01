"""Markdown formatting helpers for Lambda-Founder."""

from typing import Any, Dict


def markdown_report(data: Dict[str, Any]) -> str:
    """Return a markdown formatted report for the given data."""
    ideas = data.get("ideas", [])
    scores = data.get("scores", [])
    # TODO: expand report sections
    report = ["# Idea Synopsis", str(ideas), "", "## 9-Block Canvas", "TODO", "", "## Risk & Mitigation", "TODO", "", "## Next-24h Task List", "TODO", "", "## Learning Log", "TODO", ""]
    return "\n".join(report)
