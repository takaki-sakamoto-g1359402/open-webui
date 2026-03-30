from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    sqlite_path: str = os.getenv("HMOS_SQLITE_PATH", "./hmos.db")
    api_token: str | None = os.getenv("HMOS_API_TOKEN")
    bind_host: str = "127.0.0.1"
    bind_port: int = int(os.getenv("HMOS_PORT", "8765"))
    http_allowlist: tuple[str, ...] = tuple(
        host.strip()
        for host in os.getenv("HMOS_HTTP_ALLOWLIST", "httpbin.org").split(",")
        if host.strip()
    )
    file_sandbox_root: str = os.getenv("HMOS_FILE_SANDBOX", "./sandbox")
    kill_switch_enabled: bool = os.getenv("HMOS_KILL_SWITCH", "false").lower() == "true"


settings = Settings()
