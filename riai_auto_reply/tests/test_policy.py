import os

from datetime import datetime

import pytest

from app.policy import load_policy, should_auto_send
from app.schemas import ClassificationResult, InboundMessage, SenderInfo


@pytest.fixture(autouse=True)
def configure_policy(monkeypatch):
    policy_path = os.path.join(os.path.dirname(__file__), "..", "config", "policy.yaml")
    monkeypatch.setenv("POLICY_FILE", os.path.abspath(policy_path))
    load_policy.cache_clear()
    yield
    load_policy.cache_clear()


def make_message(**overrides):
    sender = SenderInfo(id="slack:U123456", name="Taro", is_contact=True)
    message = InboundMessage(
        platform="slack",
        channel_or_thread="C1",
        sender=sender,
        timestamp=overrides.get("timestamp") or datetime.utcnow(),
        language="en",
        subject=None,
        body_text="Thank you for the update",
        attachments=[],
        metadata={},
    )
    for key, value in overrides.items():
        setattr(message, key, value)
    return message


def test_auto_send_allowed_for_safe_ack(monkeypatch):
    message = make_message()
    classification = ClassificationResult(intent="ack", risk=10, language="en", summary="acknowledged")
    assert should_auto_send(message=message, classification=classification, draft_text="All good")


def test_auto_send_blocked_for_risky_message():
    message = make_message()
    classification = ClassificationResult(intent="ack", risk=60, language="en", summary="")
    assert not should_auto_send(message=message, classification=classification, draft_text="All good")


def test_auto_send_blocked_for_unknown_sender():
    message = make_message()
    message.sender.is_contact = False
    message.sender.id = "slack:unknown"
    classification = ClassificationResult(intent="ack", risk=10, language="en", summary="")
    assert not should_auto_send(message=message, classification=classification, draft_text="All good")


def test_auto_send_blocked_for_forbidden_keyword():
    message = make_message(body_text="Please share the password")
    classification = ClassificationResult(intent="ack", risk=0, language="en", summary="")
    assert not should_auto_send(message=message, classification=classification, draft_text="Here is the password")


def test_auto_send_blocked_when_too_long():
    message = make_message()
    classification = ClassificationResult(intent="ack", risk=0, language="en", summary="")
    draft_text = "x" * 221
    assert not should_auto_send(message=message, classification=classification, draft_text=draft_text)
