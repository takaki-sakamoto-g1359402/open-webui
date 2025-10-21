"""FastAPI entrypoint for Riai Auto-Reply Agent."""
from __future__ import annotations

import json
import os
from typing import Any, Dict

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.responses import JSONResponse

from app import init_db
from app.connectors.gmail_inbound import parse_gmail_message, poll_gmail
from app.connectors.gmail_sender import send_email
from app.connectors.slack_inbound import handle_challenge, parse_event, verify_signature
from app.connectors.slack_sender import send_message
from app.llm import get_client
from app.policy import should_auto_send
from app.schemas import InboundMessage
from app.store import list_message_history, save_draft, save_inbound
from app.utils import detect_language, init_logging, json_log
from web.admin import router as admin_router

load_dotenv()
init_logging()
init_db()

app = FastAPI(title="Riai Auto-Reply Agent", version="0.1.0")
app.include_router(admin_router)


@app.post("/webhook/slack")
async def slack_webhook(request: Request, x_slack_signature: str = Header(None), x_slack_request_timestamp: str = Header(None)):
    body = await request.body()
    verify_signature({"X-Slack-Signature": x_slack_signature or "", "X-Slack-Request-Timestamp": x_slack_request_timestamp or ""}, body)
    payload = await request.json()
    if payload.get("type") == "url_verification":
        challenge = handle_challenge(payload)
        return JSONResponse(content=challenge.dict())
    inbound = parse_event(payload)
    if not inbound:
        return JSONResponse(content={"status": "ignored"})
    result = await _process_message(inbound)
    return JSONResponse(content=result)


@app.post("/poll/gmail")
async def gmail_poll():
    polled = poll_gmail()
    processed = []
    for raw in polled.fetched:
        inbound = parse_gmail_message(raw)
        if not inbound:
            continue
        result = await _process_message(inbound)
        processed.append(result)
    return {"processed": processed, "next_page": polled.next_page_token}


async def _process_message(message: InboundMessage) -> Dict[str, Any]:
    # Ensure language detection fallback
    if not message.language:
        message.language = detect_language(message.body_text)
    llm = get_client()
    classification = llm.classify(message)
    stored = save_inbound(
        platform=message.platform,
        external_id=message.metadata.get("event_id") if message.metadata else None,
        channel=message.channel_or_thread,
        sender_id=message.sender.id,
        sender_name=message.sender.name,
        is_contact=message.sender.is_contact,
        timestamp=message.timestamp,
        language=message.language,
        subject=message.subject,
        body_text=message.body_text,
        intent=classification.intent,
        risk=classification.risk,
        summary=classification.summary,
        attachments=message.attachments,
        metadata=message.metadata,
        classification=classification.dict(),
    )
    history_messages = list_message_history(message.sender.id)
    history_text = [item.body_text for item in history_messages]
    draft_text = llm.draft_reply(message=message, classification=classification, recent_messages=history_text)
    auto_send = should_auto_send(message=message, classification=classification, draft_text=draft_text)
    draft = save_draft(
        message_id=stored.id,
        body=draft_text,
        language=classification.language or message.language or "en",
        auto_send=auto_send,
        template_used=None,
        prompt=json.dumps(classification.dict()),
    )

    send_status = "queued"
    if auto_send:
        send_status = _dispatch_send(message=message, draft_body=draft_text, record=stored, draft=draft)
    json_log(
        20,
        "Message processed",
        message_id=stored.id,
        auto_send=auto_send,
        send_status=send_status,
        intent=classification.intent,
        risk=classification.risk,
    )
    return {
        "message_id": stored.id,
        "draft_id": draft.id,
        "auto_send": auto_send,
        "send_status": send_status,
    }


def _dispatch_send(*, message: InboundMessage, draft_body: str, record, draft) -> str:
    if message.platform == "slack":
        send_message(channel=message.channel_or_thread or message.sender.id, text=draft_body, message_id=record.id, draft_id=draft.id)
        return "sent"
    elif message.platform == "gmail":
        to = message.sender.id.split(":", 1)[-1]
        send_email(thread_id=message.channel_or_thread, to=to, subject=f"Re: {message.subject or 'your email'}", body=draft_body, message_id=record.id, draft_id=draft.id)
        return "sent"
    else:
        return "unsupported"
