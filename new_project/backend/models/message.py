from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional


@dataclass
class Message:
    id: Optional[int] = None
    room_id: str = ""
    user_id: str = ""
    lang: str = "en"
    content: str = ""
    created_at: datetime = field(default_factory=datetime.utcnow)
