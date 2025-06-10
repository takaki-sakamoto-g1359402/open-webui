from pydantic import BaseModel


class InviteCreate(BaseModel):
    max_uses: int = 1


class InviteRedeem(BaseModel):
    code: str
