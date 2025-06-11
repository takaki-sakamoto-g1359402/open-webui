from dataclasses import dataclass
from typing import Optional


@dataclass
class Profile:
    id: Optional[int] = None
    user_id: str | None = None
    preferred_lang: str = "en"
    data: str = ""  # JSON 文字列として保存
