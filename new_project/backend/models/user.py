from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class User:
    id: str
    email: str
    hashed_password: str
    role: str = "PENDING"
    kyc_status: str = "UNVERIFIED"
    created_at: datetime = field(default_factory=datetime.utcnow)
