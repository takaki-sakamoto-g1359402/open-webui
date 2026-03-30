"""Slack inbound connector."""
from __future__ import annotations

import hashlib
import hmac
import os
from datetime import datetime
from typing import Dict, Optional

from fastapi import HTTPException

from ..policy import load_policy
from ..schemas import InboundMessage, SenderInfo, SlackChallenge, SlackEventEnvelope
from ..utils import detect_language, ensure_trace_id, json_log


SLACK_SIGNING_SECRET = os.getenv("SLACK_SIGNING_SECRET", "")


def verify_signature(headers: Dict[str, str], body: bytes) -> None:
    timestamp = headers.get("X-Slack-Request-Timestamp")
    signature = headers.get("X-Slack-Signature")
    if not (timestamp and signature):
        raise HTTPException(status_code=400, detail="Missing Slack signature headers")
    basestring = f"v0:{timestamp}:{body.decode('utf-8')}".encode("utf-8")
    mac = hmac.new(SLACK_SIGNING_SECRET.encode("utf-8"), basestring, hashlib.sha256)
    expected = f"v0={mac.hexdigest()}"
    if not hmac.compare_digest(expected, signature):
        raise HTTPException(status_code=403, detail="Invalid Slack signature")


def handle_challenge(payload: Dict[str, str]) -> SlackChallenge:
    challenge = SlackChallenge(**payload)
    return challenge


def parse_event(payload: Dict) -> Optional[InboundMessage]:
    envelope = SlackEventEnvelope(**payload)
    event = envelope.event
    if event.get("type") != "message":
        return None
    if event.get("subtype") in {"bot_message", "message_deleted"}:
        return None
    user = event.get("user")
    if not user:
        return None
    policy = load_policy()
    sender_id = f"slack:{user}"
    sender_info = SenderInfo(
        id=sender_id,
        name=event.get("user_profile", {}).get("real_name") or event.get("username"),
        is_contact=sender_id in policy.known_contacts,
    )
    channel = event.get("channel")
    text = event.get("text") or ""
    ts = float(event.get("ts", "0"))
    timestamp = datetime.utcfromtimestamp(ts)
    language = detect_language(text)
    trace_id = ensure_trace_id({"trace_id": envelope.event_id})

    json_log(
        20,
        "Received Slack message",
        trace_id=trace_id,
        channel=channel,
        sender=sender_id,
    )

    return InboundMessage(
        platform="slack",
        channel_or_thread=channel,
        sender=sender_info,
        timestamp=timestamp,
        language=language,
        subject=None,
        body_text=text,
        attachments=event.get("files", []),
        metadata={
            "team_id": envelope.team_id,
            "event_id": envelope.event_id,
            "trace_id": trace_id,
        },
    )
