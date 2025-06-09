from datetime import datetime

from sqlmodel import Field, SQLModel


class User(SQLModel, table=True):
    id: str = Field(primary_key=True, index=True)
    email: str = Field(index=True)
    hashed_password: str
    role: str = "PENDING"
    kyc_status: str = "UNVERIFIED"
    created_at: datetime = Field(default_factory=datetime.utcnow)
