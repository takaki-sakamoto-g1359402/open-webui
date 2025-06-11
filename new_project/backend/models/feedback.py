from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional


@dataclass
class Feedback:
    id: Optional[int] = None
    user_id: str = ""
    message: str = ""
    created_at: datetime = field(default_factory=datetime.utcnow)
