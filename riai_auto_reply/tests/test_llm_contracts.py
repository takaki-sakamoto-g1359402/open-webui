import json
import os
from datetime import datetime

import pytest

from app.llm import LLMClient, LLMConfig
from app.policy import load_policy
from app.schemas import ClassificationResult, InboundMessage, SenderInfo


class DummyContent:
    def __init__(self, text: str):
        self.text = text


class DummyOutput:
    def __init__(self, text: str):
        self.content = [DummyContent(text)]


class DummyResponse:
    def __init__(self, text: str):
        self.output = [DummyOutput(text)]
        self.output_text = text


@pytest.fixture(autouse=True)
def configure_policy(monkeypatch):
    policy_path = os.path.join(os.path.dirname(__file__), "..", "config", "policy.yaml")
    monkeypatch.setenv("POLICY_FILE", os.path.abspath(policy_path))
    load_policy.cache_clear()
    yield
    load_policy.cache_clear()


def sample_message() -> InboundMessage:
    return InboundMessage(
        platform="slack",
        channel_or_thread="C1",
        sender=SenderInfo(id="slack:U123456", name="Taro", is_contact=True),
        timestamp=datetime.utcnow(),
        language="en",
        subject=None,
        body_text="Could you confirm the meeting time tomorrow at 10?",
        attachments=[],
        metadata={},
    )


def test_classify_parses_json(monkeypatch):
    client = LLMClient(LLMConfig(api_key="changeme"))

    def fake_call(**kwargs):
        return DummyResponse('{"intent":"scheduling","risk":12,"language":"en","summary":"confirm meeting"}')

    monkeypatch.setattr(client, "_call_responses", fake_call)
    result = client.classify(sample_message())
    assert result.intent == "scheduling"
    assert result.risk == 12


def test_classify_handles_bad_json(monkeypatch):
    client = LLMClient(LLMConfig(api_key="changeme"))

    def fake_call(**kwargs):
        raise RuntimeError("API error")

    monkeypatch.setattr(client, "_call_responses", fake_call)
    result = client.classify(sample_message())
    assert result.intent == "chitchat"
    assert 0 <= result.risk <= 100


def test_draft_reply_falls_back_to_template(monkeypatch):
    client = LLMClient(LLMConfig(api_key="changeme"))

    def fake_call(**kwargs):
        raise RuntimeError("API error")

    monkeypatch.setattr(client, "_call_responses", fake_call)
    classification = ClassificationResult(intent="ack", risk=0, language="en", summary="Thanks for the update")
    draft = client.draft_reply(message=sample_message(), classification=classification, recent_messages=[])
    assert len(draft) <= 160
    assert "Thanks" in draft or "thank" in draft.lower()
