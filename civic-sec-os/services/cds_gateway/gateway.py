"""Cross Domain Solution guard stub."""
from __future__ import annotations

import hashlib
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Protocol


class Sanitizer(Protocol):
    def sanitize(self, data: bytes, *, content_type: str) -> bytes:
        ...


@dataclass
class HashRecord:
    sha256: str
    content_type: str


class InMemorySanitizer:
    def sanitize(self, data: bytes, *, content_type: str) -> bytes:  # type: ignore[override]
        digest = hashlib.sha256(data).hexdigest().encode()
        return digest + b"::" + content_type.encode()


class OneWayGuard:
    def __init__(self, outbound_dir: Path, sanitizer: Sanitizer | None = None) -> None:
        self.outbound_dir = outbound_dir
        self.outbound_dir.mkdir(parents=True, exist_ok=True)
        self.audit: list[HashRecord] = []
        self.sanitizer = sanitizer or InMemorySanitizer()

    def _write_atomic(self, path: Path, data: bytes) -> None:
        temp_path = path.with_suffix(".tmp")
        temp_path.write_bytes(data)
        os.replace(temp_path, path)

    def transfer(self, data: bytes, *, filename: str, content_type: str) -> Path:
        sanitized = self.sanitizer.sanitize(data, content_type=content_type)
        destination = self.outbound_dir / filename
        if destination.exists():
            raise FileExistsError(f"destination {destination} already exists")
        self._write_atomic(destination, sanitized)
        self.audit.append(HashRecord(sha256=hashlib.sha256(sanitized).hexdigest(), content_type=content_type))
        return destination

    def list_outbound(self) -> list[Path]:
        return sorted(self.outbound_dir.glob("*"))

    def verify_unidirectional(self) -> bool:
        for path in self.outbound_dir.rglob("*"):
            if path.is_file() and path.stat().st_mode & 0o002:
                return False
        return True


__all__ = [
    "HashRecord",
    "InMemorySanitizer",
    "OneWayGuard",
    "Sanitizer",
]
