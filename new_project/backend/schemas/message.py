from pydantic import BaseModel


class MessageCreate(BaseModel):
    room_id: str
    lang: str
    content: str
