"""LLM client abstractions."""
from __future__ import annotations

import json
import random
import re
from dataclasses import dataclass
from typing import Protocol


class LLMClient(Protocol):
    """Minimal interface expected by micro-agents."""

    model_name: str

    def generate(self, prompt: str, max_tokens: int = 256) -> str:
        ...


@dataclass
class DummyLLMClient:
    """Simple heuristic model for offline demos.

    Attempts to read action instructions from the prompt. Makes occasional
    errors to stress-test voting and red-flagging.
    """

    model_name: str = "dummy-mdap-001"
    error_rate: float = 0.15

    def generate(self, prompt: str, max_tokens: int = 256) -> str:
        # Heuristic: look for JSON-like hints embedded in the prompt.
        action = self._infer_action(prompt)
        if random.random() < self.error_rate:
            action = self._corrupt_action(action)
        return json.dumps(action)

    def _infer_action(self, prompt: str) -> dict:
        patterns = {
            "add_each": r"add ([-0-9]+) to each",
            "multiply_each": r"multiply each by ([-0-9]+)",
            "append": r"append ([-0-9]+)",
            "prepend": r"prepend ([-0-9]+)",
            "remove_value": r"remove value ([-0-9]+)",
            "drop_first": r"drop first",
            "drop_last": r"drop last",
            "sort": r"sort (ascending|descending)",
        }
        prompt_lower = prompt.lower()
        for op, pattern in patterns.items():
            match = re.search(pattern, prompt_lower)
            if match:
                value = match.group(1) if match.groups() else None
                payload = {"operation": op}
                if op == "sort":
                    payload["direction"] = value
                elif value is not None:
                    payload["value"] = int(value)
                return payload
        # default fallback
        return {"operation": "noop"}

    def _corrupt_action(self, action: dict) -> dict:
        noisy = dict(action)
        if random.random() < 0.5:
            noisy["operation"] = random.choice(
                ["noop", "append", "multiply_each", "remove_value"]
            )
        else:
            noisy["value"] = random.randint(-5, 5)
        return noisy
