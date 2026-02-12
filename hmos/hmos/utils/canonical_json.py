from __future__ import annotations

import json
from typing import Any


def canonical_dumps(payload: Any) -> str:
    return json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def canonical_bytes(payload: Any) -> bytes:
    return canonical_dumps(payload).encode("utf-8")
