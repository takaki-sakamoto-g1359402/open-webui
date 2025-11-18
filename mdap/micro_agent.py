"""Micro-agent implementation."""
from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any, Dict

from mdap.llm_client import LLMClient


@dataclass
class MicroAgentResult:
    action: Dict[str, Any] | None
    raw_output: str
    error: str | None = None


@dataclass
class MicroAgent:
    llm: LLMClient
    prompt_template: str

    def run(self, *, step_description: str, state_summary: str) -> MicroAgentResult:
        prompt = self.prompt_template.format(
            description=step_description,
            state=state_summary,
        )
        try:
            output = self.llm.generate(prompt)
        except Exception as exc:  # pragma: no cover - defensive
            return MicroAgentResult(action=None, raw_output="", error=str(exc))

        try:
            parsed = json.loads(output)
        except json.JSONDecodeError as exc:
            return MicroAgentResult(action=None, raw_output=output, error=str(exc))

        return MicroAgentResult(action=parsed, raw_output=output)


DEFAULT_PROMPT_TEMPLATE = (
    "You are a list-editing micro-agent. Given the current state and a single "
    "instruction, output ONLY JSON with keys describing the action.\n"
    "Instruction: {description}\n"
    "Current state summary: {state}\n"
    "Return JSON like {{'operation': 'add_each', 'value': 2}}."
)
