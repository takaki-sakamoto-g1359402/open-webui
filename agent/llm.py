"""LLM abstraction layer for the persistent agent prototype."""
from __future__ import annotations

import hashlib
from dataclasses import dataclass


class LLMClient:
    """Abstract interface for LLM generation."""

    def generate(self, prompt: str) -> str:  # pragma: no cover - interface
        raise NotImplementedError


@dataclass
class MockLLMClient(LLMClient):
    """Deterministic mock LLM client for tests and offline runs."""

    seed: str = "mock"

    def generate(self, prompt: str) -> str:
        digest = hashlib.sha256((self.seed + prompt).encode("utf-8")).hexdigest()
        marker = digest[:8]
        return f"[mock-{marker}] {prompt.strip()[:120]}"
