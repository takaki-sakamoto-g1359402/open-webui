from datetime import datetime
from typing import Optional
from sqlmodel import Field, SQLModel


class Message(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    room_id: str
    user_id: str = Field(foreign_key="user.id")
    lang: str
    content: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
