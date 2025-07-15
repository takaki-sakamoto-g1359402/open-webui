from __future__ import annotations

import json
import os
from typing import Any, Dict, List, Tuple

import openai

openai.api_key = os.getenv("OPENAI_API_KEY", "")


def chat_completion(
    messages: List[Dict[str, str]], *,
    model: str = "gpt-4o-mini", max_tokens: int = 100,
    temperature: float = 0.0,
) -> Any:
    return openai.ChatCompletion.create(
        model=model, messages=messages, max_tokens=max_tokens, temperature=temperature
    )


def translate_query(text: str) -> Tuple[str, str | None]:
    """Translate query to English if needed."""
    sys_prompt = (
        "You detect the language of the user text. If it's English, reply with JSON: "
        "{\"language\": \"en\", \"translation\": \"text\"}. If not, translate to "
        "English and respond JSON with language code and translation."
    )
    resp = chat_completion([
        {"role": "system", "content": sys_prompt},
        {"role": "user", "content": text},
    ])
    try:
        data = json.loads(resp.choices[0].message.content)
        lang = data.get("language", "en")
        trans = data.get("translation", text)
    except Exception:
        lang, trans = "en", text
    if lang == "en":
        return text, None
    return trans, lang
