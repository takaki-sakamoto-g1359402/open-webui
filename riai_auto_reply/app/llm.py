"""OpenAI Responses API helpers."""
from __future__ import annotations

import json
import os
from dataclasses import dataclass
from typing import List, Optional

from openai import OpenAI
from tenacity import retry, stop_after_attempt, wait_exponential

from .policy import get_template_path
from .schemas import ClassificationResult, InboundMessage
from .utils import redact_text, render_template, shorten_text


@dataclass
class LLMConfig:
    api_key: Optional[str] = None
    timeout: int = 15
    model: str = "gpt-5"


class LLMClient:
    def __init__(self, config: Optional[LLMConfig] = None):
        self.config = config or LLMConfig(api_key=os.getenv("OPENAI_API_KEY"))
        self.client: Optional[OpenAI] = None
        if self.config.api_key and self.config.api_key != "changeme":
            self.client = OpenAI(api_key=self.config.api_key, timeout=self.config.timeout)

    def _responses_kwargs(self, input_blocks: List[dict]) -> dict:
        return {
            "model": self.config.model,
            "input": input_blocks,
        }

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=6))
    def _call_responses(self, **kwargs):
        if not self.client:
            raise RuntimeError("OpenAI client not configured")
        return self.client.responses.create(**kwargs)

    def classify(self, message: InboundMessage) -> ClassificationResult:
        prompt = self._classification_prompt(message)
        try:
            response = self._call_responses(
                **self._responses_kwargs(
                    [
                        {
                            "role": "system",
                            "content": [
                                {
                                    "type": "text",
                                    "text": "You are a strict classifier. Output compact JSON only.",
                                }
                            ],
                        },
                        {
                            "role": "user",
                            "content": [
                                {
                                    "type": "text",
                                    "text": prompt,
                                }
                            ],
                        },
                    ]
                )
            )
            raw_text = response.output[0].content[0].text if response.output else response.output_text
        except Exception:
            raw_text = "{}"
        data = self._safe_json(raw_text)
        return ClassificationResult(**data)

    def draft_reply(
        self,
        *,
        message: InboundMessage,
        classification: ClassificationResult,
        recent_messages: Optional[List[str]] = None,
    ) -> str:
        context_snippets = recent_messages or []
        prompt = self._draft_prompt(message, classification, context_snippets)
        try:
            response = self._call_responses(
                **self._responses_kwargs(
                    [
                        {
                            "role": "system",
                            "content": [
                                {
                                    "type": "text",
                                    "text": (
                                        "You are a polite executive assistant, concise and factual. "
                                        "Use business tone, no over-apology."
                                    ),
                                }
                            ],
                        },
                        {
                            "role": "user",
                            "content": [
                                {
                                    "type": "text",
                                    "text": prompt,
                                }
                            ],
                        },
                    ]
                )
            )
            draft = response.output[0].content[0].text.strip()
        except Exception:
            draft = ""
        if not draft:
            draft = self._fallback_template(message, classification)
        draft = self._enforce_length(draft, classification.language or message.language)
        return draft

    def _fallback_template(self, message: InboundMessage, classification: ClassificationResult) -> str:
        template_path = get_template_path(classification.language or message.language or "en")
        summary = classification.summary or shorten_text(message.body_text, 40)
        context = {
            "sender_name": message.sender.name or "there",
            "summary": summary,
            "next_step": "We'll follow up soon." if classification.intent != "scheduling" else "Please let us know your preferred timeslot by reply.",
        }
        return render_template(template_path, context)

    def _safe_json(self, text: str) -> dict:
        try:
            return json.loads(text)
        except Exception:
            return {
                "intent": "chitchat",
                "risk": 0,
                "language": "en",
                "summary": shorten_text(text, 50),
            }

    def _classification_prompt(self, message: InboundMessage) -> str:
        truncated_body = shorten_text(message.body_text, 800)
        return (
            "Classify the inbound business message. Respond only with JSON using keys "
            "intent,risk,language,summary. Intent must be one of ack,thanks,scheduling,faq,sales,invoice,complaint,chitchat,spam. "
            "Risk is integer 0-100. Summary max 60 chars.\n"  # newline
            f"Platform: {message.platform}\n"
            f"Sender: {message.sender.id} ({message.sender.name or 'Unknown'})\n"
            f"Subject: {message.subject or 'None'}\n"
            f"Body: {redact_text(truncated_body)}"
        )

    def _draft_prompt(
        self,
        message: InboundMessage,
        classification: ClassificationResult,
        context_snippets: List[str],
    ) -> str:
        language = classification.language or message.language or "en"
        history = "\n\n".join(context_snippets[-2:]) if context_snippets else ""
        summary = classification.summary or shorten_text(message.body_text, 60)
        template_hint = self._fallback_template(message, classification)
        return (
            f"Language: {language}. "
            f"Intent: {classification.intent}. Risk score: {classification.risk}.\n"
            f"Message summary: {summary}.\n"
            f"Sender name: {message.sender.name or 'there'}.\n"
            f"Thread context (last 2 messages): {history or 'N/A'}.\n"
            f"Today's date in JST: {self._now_jst()}.\n"
            "Compose a reply between 80-160 characters in English or 100-180 characters in Japanese. "
            "If intent is scheduling, reference JST times when relevant."
            f"\nSample tone reference: {template_hint}"
        )

    def _enforce_length(self, text: str, language: Optional[str]) -> str:
        if not text:
            return text
        limit = 180 if language and language.lower().startswith("ja") else 160
        if len(text) > limit:
            return text[: limit - 3].rstrip() + "..."
        return text

    def _now_jst(self) -> str:
        from zoneinfo import ZoneInfo
        from datetime import datetime

        return datetime.now(ZoneInfo("Asia/Tokyo")).strftime("%Y-%m-%d %H:%M")


_default_client: Optional[LLMClient] = None


def get_client() -> LLMClient:
    global _default_client
    if not _default_client:
        _default_client = LLMClient()
    return _default_client
