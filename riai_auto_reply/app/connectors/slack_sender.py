"""Slack sender respecting DRY_RUN."""
from __future__ import annotations

import os
from typing import Optional

import httpx

from ..store import record_send
from ..utils import json_log

SLACK_BOT_TOKEN = os.getenv("SLACK_BOT_TOKEN", "")
DRY_RUN = os.getenv("DRY_RUN", "true").lower() != "false"
SLACK_API_URL = "https://slack.com/api/chat.postMessage"


def send_message(*, channel: str, text: str, message_id: int, draft_id: Optional[int]) -> dict:
    payload = {"channel": channel, "text": text}
    if DRY_RUN or not SLACK_BOT_TOKEN:
        json_log(20, "WOULD_SEND Slack message", channel=channel, dry_run=True)
        record_send(message_id=message_id, draft_id=draft_id, platform="slack", status="dry_run", dry_run=True)
        return {"status": "dry_run"}

    headers = {"Authorization": f"Bearer {SLACK_BOT_TOKEN}"}
    response = httpx.post(SLACK_API_URL, json=payload, headers=headers, timeout=10)
    response.raise_for_status()
    data = response.json()
    status = "sent" if data.get("ok") else "failed"
    record_send(
        message_id=message_id,
        draft_id=draft_id,
        platform="slack",
        status=status,
        dry_run=False,
        response=data,
    )
    json_log(20, "Sent Slack message", channel=channel, status=status)
    return data
