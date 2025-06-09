from datetime import datetime
from sqlmodel import Field, SQLModel


class Invite(SQLModel, table=True):
    code: str = Field(primary_key=True)
    issuer_id: str
    uses_left: int = 1
    created_at: datetime = Field(default_factory=datetime.utcnow)
