from pydantic import BaseModel


class FeedbackCreate(BaseModel):
    message: str
