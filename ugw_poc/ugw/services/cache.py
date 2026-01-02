from __future__ import annotations

import time
from typing import Any, Dict, Tuple


class TTLCache:
    def __init__(self, ttl_seconds: int) -> None:
        self.ttl_seconds = ttl_seconds
        self._items: Dict[str, Tuple[float, Any]] = {}

    def get(self, key: str) -> Any:
        if key not in self._items:
            return None
        expires_at, value = self._items[key]
        if time.time() > expires_at:
            self._items.pop(key, None)
            return None
        return value

    def set(self, key: str, value: Any) -> None:
        self._items[key] = (time.time() + self.ttl_seconds, value)
