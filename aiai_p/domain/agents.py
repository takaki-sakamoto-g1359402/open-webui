from __future__ import annotations

from typing import Any, Dict, List

from ..services import openai_adapter, rag


def run_agents(query: str) -> str:
    """Simple multi-agent pipeline using OpenAI chat completion."""
    context = rag.retrieve_context(query)
    resp1 = openai_adapter.chat_completion(
        [
            {"role": "system", "content": "Analyse context"},
            {"role": "user", "content": context},
        ],
        max_tokens=100,
    )
    analyst = str(resp1.choices[0].message.content)
    resp2 = openai_adapter.chat_completion(
        [
            {"role": "system", "content": "Create plan"},
            {"role": "user", "content": analyst},
        ],
        max_tokens=200,
    )
    return str(resp2.choices[0].message.content)
