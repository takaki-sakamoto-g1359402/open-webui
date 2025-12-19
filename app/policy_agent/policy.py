from pathlib import Path
from typing import Dict, List, Optional

import yaml

from .db import Database


DEFAULT_POLICY_PATH = Path("config/policy.yaml")


class PolicyEngine:
    def __init__(self, db: Database, policy_path: Path = DEFAULT_POLICY_PATH):
        self.db = db
        self.policy_path = policy_path
        self._config = self._load_policy()

    def _load_policy(self) -> Dict:
        if not self.policy_path.exists():
            self.policy_path.parent.mkdir(parents=True, exist_ok=True)
            default = {
                "tools": {"allow": ["notify.console"], "deny": []},
                "paths": {"allow": ["./out"]},
                "network": {"allow_domains": ["example.com"]},
                "sensitive_tools": ["file.write", "http.get"],
            }
            self.policy_path.write_text(yaml.safe_dump(default, sort_keys=False), encoding="utf-8")
            return default
        return yaml.safe_load(self.policy_path.read_text()) or {}

    @property
    def config(self) -> Dict:
        if not self._config:
            self._config = self._load_policy()
        return self._config

    def reload(self) -> None:
        self._config = self._load_policy()

    def _domain_allowed(self, url: str) -> bool:
        try:
            host = url.split("//", 1)[-1].split("/", 1)[0]
            host = host.split(":")[0]
            allowed = self.config.get("network", {}).get("allow_domains", [])
            return host in allowed
        except Exception:
            return False

    def _path_allowed(self, path: str) -> bool:
        allowed_paths: List[str] = self.config.get("paths", {}).get("allow", [])
        return any(Path(path).resolve().as_posix().startswith(Path(p).resolve().as_posix()) for p in allowed_paths)

    def check(self, tool_name: str, context: Dict[str, Optional[str]]) -> Dict[str, str]:
        tools_cfg = self.config.get("tools", {})
        allow = set(tools_cfg.get("allow", []))
        deny = set(tools_cfg.get("deny", []))
        if tool_name in deny:
            return {"allowed": False, "reason": "Tool explicitly denied"}
        if tool_name not in allow:
            return {"allowed": False, "reason": "Tool not in allowlist"}

        if tool_name == "file.write":
            path = context.get("path") or ""
            if not self._path_allowed(path):
                return {"allowed": False, "reason": "Path not allowed"}

        if tool_name == "http.get":
            url = context.get("url") or ""
            if not self._domain_allowed(url):
                return {"allowed": False, "reason": "Domain not allowed"}

        sensitive = self.config.get("sensitive_tools", [])
        if tool_name in sensitive:
            token = context.get("pop_token")
            if not self.db.validate_token(token):
                return {"allowed": False, "reason": "Sensitive action requires valid pop_token"}

        return {"allowed": True, "reason": "Allowed by policy"}

