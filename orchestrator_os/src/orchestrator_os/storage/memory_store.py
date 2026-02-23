from __future__ import annotations

import json
from typing import Any

from orchestrator_os.storage.db import get_connection


class MemoryStore:
    def put(self, task_id: str, key: str, value: dict[str, Any], metadata: dict[str, Any] | None = None) -> None:
        with get_connection() as conn:
            conn.execute(
                "INSERT INTO memories (task_id, key, value_json, metadata_json) VALUES (?, ?, ?, ?)",
                (task_id, key, json.dumps(value), json.dumps(metadata or {})),
            )
            conn.commit()
