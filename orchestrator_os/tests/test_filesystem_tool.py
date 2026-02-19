import pytest

from orchestrator_os.tools.filesystem import FilesystemInput, FilesystemTool


def test_filesystem_blocks_path_traversal(tmp_path, monkeypatch):
    monkeypatch.setenv("ORCHESTRATOR_WORKSPACE", str(tmp_path / "workspace"))
    tool = FilesystemTool()
    assert tool.is_sandbox_safe({"path": "ok.txt"}) is True
    assert tool.is_sandbox_safe({"path": "../escape.txt"}) is False
    with pytest.raises(ValueError):
        tool.run(FilesystemInput(action="write", path="../escape.txt", content="bad"))
