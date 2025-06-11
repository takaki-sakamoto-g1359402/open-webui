from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional


@dataclass
class Announcement:
    id: Optional[int] = None
    author_id: str = ""
    title: str = ""
    src_lang: str = "en"
    translations: str = ""  # JSON 文字列
    created_at: datetime = field(default_factory=datetime.utcnow)
