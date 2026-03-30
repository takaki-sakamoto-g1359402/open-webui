"""Gmail poller stub."""
from __future__ import annotations

import base64
import os
from datetime import datetime
from typing import Dict, Optional

from ..policy import load_policy
from ..schemas import GmailPollResult, InboundMessage, SenderInfo
from ..utils import detect_language, ensure_trace_id, json_log


DRY_RUN = os.getenv("DRY_RUN", "true").lower() != "false"


def poll_gmail() -> GmailPollResult:
    """Stub poller that would call Gmail API in production."""
    json_log(20, "Polling Gmail", dry_run=DRY_RUN)
    return GmailPollResult(fetched=[], next_page_token=None)


def parse_gmail_message(payload: Dict) -> Optional[InboundMessage]:
    headers = {item.get("name"): item.get("value") for item in payload.get("payload", {}).get("headers", [])}
    sender = headers.get("From", "unknown@unknown")
    subject = headers.get("Subject")
    thread_id = payload.get("threadId")
    body = _decode_body(payload)
    policy = load_policy()
    sender_id = f"gmail:{sender}".lower()
    sender_info = SenderInfo(
        id=sender_id,
        name=sender.split("<")[0].strip() if "<" in sender else sender,
        is_contact=sender_id in policy.known_contacts,
    )
    language = detect_language(body)
    timestamp_ms = int(payload.get("internalDate", "0"))
    timestamp = datetime.utcfromtimestamp(timestamp_ms / 1000) if timestamp_ms else datetime.utcnow()
    trace_id = ensure_trace_id(payload.get("metadata"))
    json_log(20, "Parsed Gmail message", trace_id=trace_id, thread=thread_id)
    return InboundMessage(
        platform="gmail",
        channel_or_thread=thread_id,
        sender=sender_info,
        timestamp=timestamp,
        language=language,
        subject=subject,
        body_text=body,
        attachments=payload.get("payload", {}).get("parts", []),
        metadata={"thread_id": thread_id, "trace_id": trace_id},
    )


def _decode_body(payload: Dict) -> str:
    parts = payload.get("payload", {}).get("parts", [])
    if not parts:
        data = payload.get("payload", {}).get("body", {}).get("data")
        return _decode_base64(data)
    for part in parts:
        if part.get("mimeType") == "text/plain":
            return _decode_base64(part.get("body", {}).get("data"))
    return ""


def _decode_base64(data: Optional[str]) -> str:
    if not data:
        return ""
    try:
        decoded = base64.urlsafe_b64decode(data.encode("utf-8"))
        return decoded.decode("utf-8", errors="ignore")
    except Exception:
        return ""
