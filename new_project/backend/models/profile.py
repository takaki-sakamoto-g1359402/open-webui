from typing import Optional
from sqlmodel import Field, SQLModel


class Profile(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(foreign_key="user.id")
    preferred_lang: str
    data: str  # JSON 文字列として保存
