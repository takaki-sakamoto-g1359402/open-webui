from datetime import datetime
from typing import Optional
from sqlmodel import Field, SQLModel


class Feedback(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(foreign_key="user.id")
    message: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
