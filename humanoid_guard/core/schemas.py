"""Data models for robot state and tasks."""
from pydantic import BaseModel, Field
from typing import Optional, List

class Coordinates(BaseModel):
    x: float = Field(..., description="X coordinate")
    y: float = Field(..., description="Y coordinate")

class Heartbeat(BaseModel):
    id: str
    type: str
    battery: float = Field(..., ge=0, le=100)
    coords: Coordinates

class Task(BaseModel):
    id: str
    command: str
    params: Optional[dict] = None
    target_robot: Optional[str] = None

class Assignment(BaseModel):
    robot_id: str
    task_id: str
    status: str

