from __future__ import annotations

from pathlib import Path

from pydantic import BaseModel, Field

from orchestrator_os.config import get_settings
from orchestrator_os.core.models import RiskTier, ToolCallResult
from orchestrator_os.tools.base import Tool


class FilesystemInput(BaseModel):
    action: str = Field(pattern="^(read|write)$")
    path: str
    content: str | None = None


class FilesystemOutput(BaseModel):
    path: str
    content: str | None = None
    bytes_written: int | None = None


class FilesystemTool(Tool):
    name = "filesystem"
    description = "Sandboxed read/write under configured workspace directory"
    risk_tier = RiskTier.R1
    required_scopes = ["fs:read", "fs:write"]
    input_model = FilesystemInput
    output_model = FilesystemOutput

    def _resolve(self, raw_path: str) -> Path:
        settings = get_settings()
        root = settings.workspace_dir.resolve()
        target = (root / raw_path).resolve()
        if not str(target).startswith(str(root)):
            raise ValueError("Path traversal blocked: outside workspace sandbox")
        return target

    def is_sandbox_safe(self, payload: dict) -> bool:
        try:
            self._resolve(str(payload.get("path", "")))
            return True
        except ValueError:
            return False

    def run(self, data: FilesystemInput) -> ToolCallResult:
        settings = get_settings()
        target = self._resolve(data.path)
        target.parent.mkdir(parents=True, exist_ok=True)
        if data.action == "read":
            if not target.exists():
                return ToolCallResult(ok=False, error="File not found")
            content = target.read_text(encoding="utf-8")
            return ToolCallResult(ok=True, output=FilesystemOutput(path=str(target), content=content).model_dump())
        payload = (data.content or "").encode("utf-8")
        if len(payload) > settings.filesystem_max_bytes:
            return ToolCallResult(ok=False, error="File size exceeds 1MB")
        target.write_bytes(payload)
        return ToolCallResult(
            ok=True,
            output=FilesystemOutput(path=str(target), bytes_written=len(payload)).model_dump(),
            artifact_refs=[str(target)],
        )
