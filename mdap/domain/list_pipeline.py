"""Domain logic for deterministic list transformation tasks."""
from __future__ import annotations

from dataclasses import dataclass
from typing import List, Sequence


@dataclass
class MicroStep:
    step_id: int
    description: str
    operation: str
    argument: int | None = None
    direction: str | None = None  # only for sorting


@dataclass
class PipelineTask:
    initial_state: List[int]
    steps: List[MicroStep]


class ListPipelineDomain:
    """Utility methods for list editing tasks."""

    allowed_ops = {
        "add_each",
        "multiply_each",
        "append",
        "prepend",
        "remove_value",
        "drop_first",
        "drop_last",
        "sort",
    }

    def apply_action(self, state: Sequence[int], action: dict) -> List[int]:
        lst = list(state)
        op = action.get("operation")
        if op == "add_each":
            value = action["value"]
            return [x + value for x in lst]
        if op == "multiply_each":
            value = action["value"]
            return [x * value for x in lst]
        if op == "append":
            return lst + [action["value"]]
        if op == "prepend":
            return [action["value"]] + lst
        if op == "remove_value":
            value = action["value"]
            return [x for x in lst if x != value]
        if op == "drop_first":
            return lst[1:]
        if op == "drop_last":
            return lst[:-1]
        if op == "sort":
            reverse = action.get("direction", "ascending") == "descending"
            return sorted(lst, reverse=reverse)
        if op == "noop":
            return lst
        raise ValueError(f"Unsupported operation {op}")

    def describe_state(self, state: Sequence[int]) -> str:
        return ", ".join(str(x) for x in state) if state else "<empty>"


class InstructionParser:
    """Extremely small DSL parser for list instructions."""

    def parse(self, payload: dict) -> PipelineTask:
        initial = list(payload["initial"])
        steps_raw = payload["instructions"]
        steps: List[MicroStep] = []
        for idx, text in enumerate(steps_raw, start=1):
            text_lower = text.lower().strip()
            if text_lower.startswith("add") and "each" in text_lower:
                value = self._extract_int(text_lower)
                steps.append(
                    MicroStep(
                        idx,
                        description=text,
                        operation="add_each",
                        argument=value,
                    )
                )
            elif text_lower.startswith("multiply"):
                value = self._extract_int(text_lower)
                steps.append(
                    MicroStep(
                        idx, text, "multiply_each", argument=value
                    )
                )
            elif text_lower.startswith("append"):
                value = self._extract_int(text_lower)
                steps.append(MicroStep(idx, text, "append", argument=value))
            elif text_lower.startswith("prepend"):
                value = self._extract_int(text_lower)
                steps.append(MicroStep(idx, text, "prepend", argument=value))
            elif text_lower.startswith("remove"):
                value = self._extract_int(text_lower)
                steps.append(
                    MicroStep(idx, text, "remove_value", argument=value)
                )
            elif "drop" in text_lower and "first" in text_lower:
                steps.append(MicroStep(idx, text, "drop_first"))
            elif "drop" in text_lower and "last" in text_lower:
                steps.append(MicroStep(idx, text, "drop_last"))
            elif text_lower.startswith("sort"):
                direction = "descending" if "desc" in text_lower else "ascending"
                steps.append(
                    MicroStep(idx, text, "sort", direction=direction)
                )
            else:
                raise ValueError(f"Unsupported instruction: {text}")
        return PipelineTask(initial_state=initial, steps=steps)

    def _extract_int(self, text: str) -> int:
        tokens = [token for token in text.replace(",", "").split() if token]
        for token in tokens[::-1]:
            if token.strip("+-").isdigit():
                return int(token)
        raise ValueError(f"Could not find integer in '{text}'")
