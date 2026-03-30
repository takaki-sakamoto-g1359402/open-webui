from datetime import datetime, date
from typing import Optional, List

from pydantic import BaseModel, Field


class TalentCreate(BaseModel):
    name: str
    kind: str = Field(..., regex="^(human|ai)$")
    priority_score: float = 0.5
    max_weekly_hours: float = 40.0
    notes: Optional[str] = None


class TalentRead(BaseModel):
    id: int
    name: str
    kind: str
    priority_score: float
    max_weekly_hours: float
    notes: Optional[str]

    class Config:
        orm_mode = True


class FatigueResponse(BaseModel):
    talent_id: int
    fatigue_score: float


class SchedulerRunRequest(BaseModel):
    week_start: date


class ScheduleRecommendationRead(BaseModel):
    id: int
    generated_at: datetime
    target_week_start: date
    talent_id: int
    slot_start: datetime
    slot_end: datetime
    reason: str

    class Config:
        orm_mode = True


class ModerateRequest(BaseModel):
    talent_id: Optional[int]
    user_id: str
    message: str


class ModerateResponse(BaseModel):
    safe: bool
    violation_category: Optional[str]


class ChatReplyResponse(ModerateResponse):
    assistant_reply: Optional[str]


class ChatLogRead(BaseModel):
    id: int
    timestamp: datetime
    talent_id: Optional[int]
    user_id: str
    message: str
    safe: bool
    violation_category: Optional[str]
    assistant_reply: Optional[str]

    class Config:
        orm_mode = True


class PaginatedChatLogs(BaseModel):
    logs: List[ChatLogRead]
    total: int

