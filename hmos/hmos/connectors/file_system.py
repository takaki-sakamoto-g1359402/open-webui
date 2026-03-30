from __future__ import annotations

from pathlib import Path
from typing import Any, Dict

from hmos.connectors.base import Connector, ConnectorCapability
from hmos.models import ConnectorResult, RiskLevel


class FileSystemConnector(Connector):
    name = "file_system"
    capabilities = (
        ConnectorCapability("file_read", RiskLevel.RISK0),
        ConnectorCapability("file_write", RiskLevel.RISK1),
    )

    def __init__(self, sandbox_root: str) -> None:
        self._root = Path(sandbox_root).resolve()
        self._root.mkdir(parents=True, exist_ok=True)

    def execute(self, payload: Dict[str, Any]) -> ConnectorResult:
        action = payload.get("action")
        path = payload.get("path", "")
        target = self._resolve(path)
        if action == "read":
            data = target.read_text(encoding="utf-8")
            return ConnectorResult(status="ok", output={"path": str(target), "content": data})
        if action == "write":
            content = payload.get("content", "")
            target.write_text(content, encoding="utf-8")
            return ConnectorResult(status="ok", output={"path": str(target)})
        raise ValueError("Unsupported file action")

    def _resolve(self, path: str) -> Path:
        target = (self._root / path).resolve()
        if self._root not in target.parents and target != self._root:
            raise ValueError("Path traversal detected")
        return target
