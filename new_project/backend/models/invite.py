from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class Invite:
    code: str
    issuer_id: str
    uses_left: int = 1
    created_at: datetime = field(default_factory=datetime.utcnow)
