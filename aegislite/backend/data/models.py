from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class Asset(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    type: str


class Agent(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    x: int = 0
    y: int = 0
    status: str = "idle"


class GeoFence(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    allowed: bool = True
    x1: int
    y1: int
    x2: int
    y2: int


class Mission(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    sensitivity: int = 1
    start_x: int
    start_y: int
    target_x: int
    target_y: int
    status: str = "new"


class Event(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    type: str
    message: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
