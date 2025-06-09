from pydantic import BaseModel


class AnnouncementCreate(BaseModel):
    title: str
    body: str
    src_lang: str
