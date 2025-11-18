"""Red-flagging logic for list pipeline domain."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Tuple

from mdap.domain.list_pipeline import MicroStep


@dataclass
class RedFlagResult:
    ok: bool
    reason: str | None = None


@dataclass
class RedFlagger:
    max_tokens_per_call: int

    def validate(self, *, step: MicroStep, candidate: dict, raw_output: str) -> RedFlagResult:
        if len(raw_output) > self.max_tokens_per_call * 4:
            return RedFlagResult(False, "output too long")
        if not isinstance(candidate, dict):
            return RedFlagResult(False, "candidate not dict")
        op = candidate.get("operation")
        if op != step.operation:
            return RedFlagResult(False, f"expected {step.operation}, got {op}")
        if op in {"add_each", "multiply_each", "append", "prepend", "remove_value"}:
            value = candidate.get("value")
            if not isinstance(value, int):
                return RedFlagResult(False, "missing integer value")
            if abs(value) > 10_000:
                return RedFlagResult(False, "value out of bounds")
        if op == "sort":
            direction = candidate.get("direction")
            if direction not in {"ascending", "descending"}:
                return RedFlagResult(False, "bad sort direction")
        return RedFlagResult(True)


class CandidateNormalizer:
    """Produces canonical keys for voting tallies."""

    def canonical_key(self, action: dict) -> Tuple:
        op = action.get("operation")
        value = action.get("value")
        direction = action.get("direction")
        return (op, value, direction)
