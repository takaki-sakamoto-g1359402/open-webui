"""Safety policy enforcement."""
from __future__ import annotations

import ast
import shlex
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, Optional
from urllib.parse import urlparse

import yaml


class SafetyViolation(RuntimeError):
    """Raised when a safety policy is violated."""

    def __init__(self, reason: str, policy: str) -> None:
        super().__init__(reason)
        self.reason = reason
        self.policy = policy

    def to_dict(self) -> Dict[str, str]:
        return {"reason": self.reason, "policy": self.policy}


@dataclass
class SafetyPolicy:
    command_allowlist: set[str]
    command_denylist: set[str]
    web_enabled: bool
    domain_allowlist: set[str]
    filesystem_base: Path
    filesystem_read_only: bool
    filesystem_max_read_bytes: int
    web_timeout: int
    web_max_content_length: int


class SafetyGuard:
    """Enforces the configured safety policy."""

    def __init__(self, policy: SafetyPolicy) -> None:
        self.policy = policy

    @classmethod
    def from_yaml(cls, path: Path) -> "SafetyGuard":
        data = yaml.safe_load(path.read_text())
        policy = SafetyPolicy(
            command_allowlist=set(data.get("command_allowlist", [])),
            command_denylist=set(data.get("command_denylist", [])),
            web_enabled=bool(data.get("web", {}).get("enabled", False)),
            domain_allowlist=set(data.get("web", {}).get("domain_allowlist", [])),
            filesystem_base=Path(data.get("filesystem", {}).get("base_dir", ".")).resolve(),
            filesystem_read_only=bool(data.get("filesystem", {}).get("read_only", True)),
            filesystem_max_read_bytes=int(data.get("filesystem", {}).get("max_read_bytes", 131072)),
            web_timeout=int(data.get("web", {}).get("timeout_seconds", 2)),
            web_max_content_length=int(data.get("web", {}).get("max_content_length", 65536)),
        )
        return cls(policy)

    def refuse_and_explain(self, reason: str, policy: str) -> SafetyViolation:
        raise SafetyViolation(reason, policy)

    def _check_command_allowed(self, command: str) -> None:
        parts = shlex.split(command)
        if not parts:
            return
        head = parts[0]
        if head in self.policy.command_denylist:
            raise SafetyViolation(f"Command '{head}' is deny-listed", "shell.denylist")
        if self.policy.command_allowlist and head not in self.policy.command_allowlist:
            raise SafetyViolation(f"Command '{head}' is not in allowlist", "shell.allowlist")

    def check_shell_command(self, command: str) -> None:
        self._check_command_allowed(command)

    def ensure_tool_allowed(self, name: str, enabled_tools: Iterable[str]) -> None:
        if name not in set(enabled_tools):
            raise SafetyViolation(f"Tool '{name}' is not enabled", "tools.enabled")

    def ensure_web_allowed(self, url: str) -> None:
        if not self.policy.web_enabled:
            raise SafetyViolation("Web access is disabled", "web.disabled")
        parsed = urlparse(url)
        domain = parsed.netloc.lower()
        if domain not in self.policy.domain_allowlist:
            raise SafetyViolation(f"Domain '{domain}' is not allowlisted", "web.allowlist")

    def ensure_filesystem_path(self, path: Path, for_write: bool = False) -> Path:
        full = (self.policy.filesystem_base / path).resolve() if not path.is_absolute() else path.resolve()
        if self.policy.filesystem_read_only and for_write:
            raise SafetyViolation("Filesystem is read-only", "fs.readonly")
        if self.policy.filesystem_base not in full.parents and full != self.policy.filesystem_base:
            raise SafetyViolation("Path escapes sandbox", "fs.sandbox")
        return full

    def ensure_python_code_safe(self, code: str, allowed_modules: Optional[set[str]] = None) -> None:
        tree = ast.parse(code, mode="exec")
        for node in ast.walk(tree):
            if isinstance(node, (ast.Import, ast.ImportFrom)):
                names = [alias.name.split(".")[0] for alias in node.names]
                for name in names:
                    if allowed_modules and name in allowed_modules:
                        continue
                    raise SafetyViolation(f"Import '{name}' is not allowed", "python.import")
            if isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id in {"__import__", "exec", "eval"}:
                raise SafetyViolation(f"Function '{node.func.id}' is not allowed", "python.builtins")
            if isinstance(node, ast.Attribute) and getattr(node, "attr", "").startswith("__"):
                raise SafetyViolation("Access to dunder attributes is blocked", "python.dunder")

