"""Provider-agnostic LLM interfaces with offline deterministic fallback."""

from __future__ import annotations

import json
from abc import ABC, abstractmethod


class LLMClient(ABC):
    @abstractmethod
    def chat(self, system_prompt: str, messages: list[dict]) -> str:
        raise NotImplementedError


class MockLLM(LLMClient):
    def chat(self, system_prompt: str, messages: list[dict]) -> str:
        goal = messages[-1].get("content", "goal") if messages else "goal"
        payload = {
            "steps": [
                {
                    "step_id": "1",
                    "title": "Understand goal",
                    "instruction": "Echo the goal for traceability",
                    "suggested_tools": ["echo"],
                    "risk_hint": "R0",
                    "max_attempts": 2,
                },
                {
                    "step_id": "2",
                    "title": "Persist note",
                    "instruction": "Write a workspace note about the goal",
                    "suggested_tools": ["filesystem"],
                    "risk_hint": "R1",
                    "max_attempts": 2,
                },
                {
                    "step_id": "3",
                    "title": "Optional context fetch",
                    "instruction": "Fetch mocked context if approved",
                    "suggested_tools": ["web_fetch"],
                    "risk_hint": "R2",
                    "max_attempts": 1,
                },
            ],
            "goal": goal,
        }
        return json.dumps(payload, sort_keys=True)


class OpenAIAdapter(LLMClient):
    def __init__(self, api_key: str) -> None:
        self.api_key = api_key

    def chat(self, system_prompt: str, messages: list[dict]) -> str:
        raise NotImplementedError("OpenAI adapter scaffold only; use MockLLM in offline mode")
