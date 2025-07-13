## Overview
# Chat engine wrapping OpenAI GPT-4o

import os
from typing import Iterable, List
import openai


class ChatEngine:
    """Simple wrapper around OpenAI chat completion."""

    def __init__(self, api_key: str | None = None, model: str = "gpt-4o") -> None:
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("OpenAI API key is required")
        self.model = model
        openai.api_key = self.api_key

    def chat(self, messages: List[dict], temperature: float = 0.7, stream: bool = False) -> Iterable[str]:
        """Send chat completion request."""
        resp = openai.ChatCompletion.create(
            model=self.model,
            messages=messages,
            temperature=temperature,
            stream=stream,
        )
        if stream:
            for chunk in resp:
                delta = chunk.choices[0].delta.get("content")
                if delta:
                    yield delta
        else:
            yield resp.choices[0].message.content
