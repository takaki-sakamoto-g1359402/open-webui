"""SQLite persistence powered by SQLModel."""
from __future__ import annotations

import json
import os
from contextlib import contextmanager
from datetime import datetime
from hashlib import sha256
from typing import Generator, List, Optional

from sqlmodel import Field, Session, SQLModel, create_engine, select


DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./riai_auto_reply.db")
engine = create_engine(DATABASE_URL, echo=False, connect_args={"check_same_thread": False})


class Message(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    platform: str
    external_id: Optional[str] = None
    channel_or_thread: Optional[str] = None
    sender_id: str
    sender_name: Optional[str] = None
    is_contact: bool = False
    timestamp: datetime
    language: Optional[str] = None
    subject: Optional[str] = None
    body_text: str
    intent: Optional[str] = None
    risk: Optional[int] = None
    summary: Optional[str] = None
    attachments_json: str = Field(default="[]")
    metadata_json: str = Field(default="{}")
    classification_json: str = Field(default="{}")
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Draft(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    message_id: int = Field(foreign_key="message.id")
    body: str
    language: str
    auto_send: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    template_used: Optional[str] = None
    prompt_hash: Optional[str] = None
    draft_hash: Optional[str] = None
    status: str = "pending"


class SendLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    message_id: int
    draft_id: Optional[int] = None
    sent_at: datetime = Field(default_factory=datetime.utcnow)
    platform: str
    status: str
    dry_run: bool = True
    response_json: str = Field(default="{}")


def init_db() -> None:
    SQLModel.metadata.create_all(engine)


@contextmanager
def session_scope() -> Generator[Session, None, None]:
    session = Session(engine)
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def _hash(value: str) -> str:
    return sha256(value.encode("utf-8")).hexdigest()


def save_inbound(
    *,
    platform: str,
    external_id: Optional[str],
    channel: Optional[str],
    sender_id: str,
    sender_name: Optional[str],
    is_contact: bool,
    timestamp: datetime,
    language: Optional[str],
    subject: Optional[str],
    body_text: str,
    intent: Optional[str],
    risk: Optional[int],
    summary: Optional[str],
    attachments: List[dict],
    metadata: dict,
    classification: dict,
) -> Message:
    record = Message(
        platform=platform,
        external_id=external_id,
        channel_or_thread=channel,
        sender_id=sender_id,
        sender_name=sender_name,
        is_contact=is_contact,
        timestamp=timestamp,
        language=language,
        subject=subject,
        body_text=body_text,
        intent=intent,
        risk=risk,
        summary=summary,
        attachments_json=json.dumps(attachments or []),
        metadata_json=json.dumps(metadata or {}),
        classification_json=json.dumps(classification or {}),
    )
    with session_scope() as session:
        session.add(record)
        session.flush()
        session.refresh(record)
        return record


def save_draft(
    *,
    message_id: int,
    body: str,
    language: str,
    auto_send: bool,
    template_used: Optional[str],
    prompt: str,
) -> Draft:
    draft = Draft(
        message_id=message_id,
        body=body,
        language=language,
        auto_send=auto_send,
        template_used=template_used,
        prompt_hash=_hash(prompt),
        draft_hash=_hash(body),
    )
    with session_scope() as session:
        session.add(draft)
        session.flush()
        session.refresh(draft)
        return draft


def record_send(
    *,
    message_id: int,
    draft_id: Optional[int],
    platform: str,
    status: str,
    dry_run: bool,
    response: Optional[dict] = None,
) -> SendLog:
    log = SendLog(
        message_id=message_id,
        draft_id=draft_id,
        platform=platform,
        status=status,
        dry_run=dry_run,
        response_json=json.dumps(response or {}),
    )
    with session_scope() as session:
        session.add(log)
        session.flush()
        session.refresh(log)
        return log


def list_pending_drafts(limit: int = 50) -> List[Draft]:
    with session_scope() as session:
        statement = select(Draft).where(Draft.status == "pending").order_by(Draft.created_at.asc()).limit(limit)
        return list(session.exec(statement))


def get_draft(draft_id: int) -> Optional[Draft]:
    with session_scope() as session:
        return session.get(Draft, draft_id)


def mark_draft_status(draft_id: int, status: str) -> None:
    with session_scope() as session:
        draft = session.get(Draft, draft_id)
        if not draft:
            return
        draft.status = status
        session.add(draft)


def get_message(message_id: int) -> Optional[Message]:
    with session_scope() as session:
        return session.get(Message, message_id)


def list_message_history(sender_id: str, limit: int = 2) -> List[Message]:
    with session_scope() as session:
        statement = (
            select(Message)
            .where(Message.sender_id == sender_id)
            .order_by(Message.timestamp.desc())
            .limit(limit)
        )
        return list(session.exec(statement))
