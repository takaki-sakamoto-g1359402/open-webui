from __future__ import annotations

from pathlib import Path

import pytest

from riai.safety import SafetyGuard, SafetyViolation
from riai.tools import ToolError
from riai.tools.filesystem import FilesystemTool
from riai.tools.python_exec import PythonExecutionTool


def make_guard(tmp_path: Path) -> SafetyGuard:
    policy_path = Path(__file__).resolve().parents[1] / "policies" / "safety.yaml"
    guard = SafetyGuard.from_yaml(policy_path)
    guard.policy.filesystem_base = tmp_path.resolve()
    return guard


def test_filesystem_read_only(tmp_path: Path) -> None:
    guard = make_guard(tmp_path)
    tool = FilesystemTool(guard)
    sample = tmp_path / "note.txt"
    sample.write_text("hello")
    listing = tool.run(action="list", path=".")
    assert "note.txt" in listing.output
    text = tool.run(action="read_text", path="note.txt")
    assert "hello" in text.output
    with pytest.raises(ToolError):
        tool.run(action="write", path="note.txt")


def test_python_exec_blocks_import(tmp_path: Path) -> None:
    guard = make_guard(tmp_path)
    tool = PythonExecutionTool(guard)
    result = tool.run(code="result = 1 + 1")
    assert "result=2" in result.output
    with pytest.raises(SafetyViolation):
        tool.run(code="import os\nresult = os.name")

