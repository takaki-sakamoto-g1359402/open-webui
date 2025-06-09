from datetime import datetime
from typing import Optional
from sqlmodel import Field, SQLModel


class Announcement(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    author_id: str = Field(foreign_key="user.id")
    title: str
    src_lang: str
    translations: str  # JSON 文字列
    created_at: datetime = Field(default_factory=datetime.utcnow)
