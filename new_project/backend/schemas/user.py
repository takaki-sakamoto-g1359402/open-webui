from pydantic import BaseModel


class UserCreate(BaseModel):
    email: str
    password: str
    id_document: str


class UserLogin(BaseModel):
    email: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ProfileUpdate(BaseModel):
    preferred_lang: str
    data: dict[str, str]
