"""Data schemas for the Riai Auto-Reply Agent."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, validator


class SenderInfo(BaseModel):
    id: str
    name: Optional[str] = None
    is_contact: bool = False


class InboundMessage(BaseModel):
    platform: str
    channel_or_thread: Optional[str] = None
    sender: SenderInfo
    timestamp: datetime
    language: Optional[str] = None
    subject: Optional[str] = None
    body_text: str
    attachments: List[Dict[str, Any]] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)

    @validator("platform")
    def platform_lower(cls, value: str) -> str:
        return value.lower()


class ClassificationResult(BaseModel):
    intent: str = "chitchat"
    risk: int = 0
    language: str = "en"
    summary: str = ""

    @validator("risk", pre=True)
    def clamp_risk(cls, value: Any) -> int:
        try:
            ivalue = int(value)
        except (TypeError, ValueError):
            ivalue = 0
        return max(0, min(100, ivalue))

    @validator("intent")
    def default_intent(cls, value: str) -> str:
        if not value:
            return "chitchat"
        return value


class DraftReply(BaseModel):
    message_id: int
    body: str
    language: str
    auto_send: bool
    created_at: datetime


class ApprovalAction(BaseModel):
    approved: bool
    actor: str


class SlackChallenge(BaseModel):
    challenge: str


class SlackEventEnvelope(BaseModel):
    token: str
    team_id: str
    api_app_id: str
    type: str
    event: Dict[str, Any]
    event_id: str
    event_time: int


class GmailPollResult(BaseModel):
    fetched: List[Dict[str, Any]] = Field(default_factory=list)
    next_page_token: Optional[str] = None
