from __future__ import annotations

from typing import List

from ugw.utils.crypto import sha256_digest


def merkle_root(hashes: List[str]) -> str:
    if not hashes:
        return ""
    level = hashes[:]
    while len(level) > 1:
        next_level = []
        for i in range(0, len(level), 2):
            left = level[i]
            right = level[i + 1] if i + 1 < len(level) else level[i]
            combined = sha256_digest(f"{left}{right}".encode("utf-8"))
            next_level.append(combined)
        level = next_level
    return level[0]
