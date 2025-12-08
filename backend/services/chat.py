import os
from datetime import datetime
from typing import Optional

from openai import OpenAI, OpenAIError
from sqlalchemy.orm import Session

from backend.models import ChatLog


BANNED_WORDS = {"hate", "violence", "kill"}


class ChatService:
    def __init__(self, db: Session):
        self.db = db
        self.client: Optional[OpenAI] = None
        api_key = os.getenv("OPENAI_API_KEY")
        if api_key:
            self.client = OpenAI(api_key=api_key)

    def _classify(self, message: str) -> str:
        lowered = message.lower()
        if any(banned in lowered for banned in BANNED_WORDS):
            return "banned_word"
        if len(message) > 500:
            return "too_long"
        if not self.client:
            return "ok"
        try:
            completion = self.client.responses.create(
                model="gpt-4o-mini",
                input=f"Classify the message into ok, hate_speech, sexual, self_harm: {message}",
            )
            content = completion.output_text or ""
            for category in ["hate_speech", "sexual", "self_harm"]:
                if category in content.lower():
                    return category
        except OpenAIError:
            return "ok"
        return "ok"

    def moderate(self, talent_id: Optional[int], user_id: str, message: str) -> ChatLog:
        category = self._classify(message)
        safe = category == "ok"
        chat_log = ChatLog(
            timestamp=datetime.utcnow(),
            talent_id=talent_id,
            user_id=user_id,
            message=message,
            safe=safe,
            violation_category=None if safe else category,
        )
        self.db.add(chat_log)
        self.db.commit()
        self.db.refresh(chat_log)
        return chat_log

    def reply(self, talent_id: Optional[int], user_id: str, message: str) -> ChatLog:
        chat_log = self.moderate(talent_id, user_id, message)
        if not chat_log.safe:
            chat_log.assistant_reply = (
                "Your message violated our community guidelines. It was not shown to the streamer."
            )
            self.db.commit()
            self.db.refresh(chat_log)
            return chat_log

        reply = "Thanks for coming to the stream!"
        if self.client:
            try:
                completion = self.client.responses.create(
                    model="gpt-4o-mini",
                    input=[
                        {
                            "role": "system",
                            "content": "You are an AI assistant for a VTuber. Be friendly, concise, safe, and avoid heavy topics.",
                        },
                        {"role": "user", "content": message},
                    ],
                )
                reply = completion.output_text or reply
            except OpenAIError:
                reply = reply

        chat_log.assistant_reply = reply
        self.db.commit()
        self.db.refresh(chat_log)
        return chat_log

    def list_logs(self, skip: int = 0, limit: int = 20):
        query = self.db.query(ChatLog).order_by(ChatLog.timestamp.desc())
        total = query.count()
        return query.offset(skip).limit(limit).all(), total
