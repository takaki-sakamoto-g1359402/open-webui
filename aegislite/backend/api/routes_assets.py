from fastapi import APIRouter, Depends, Request
from sqlmodel import Session, select

from ..data.models import Asset
from ..deps import get_session

router = APIRouter()


@router.get("/assets")
def list_assets(request: Request, session: Session = Depends(get_session)):
    request.state.decision = "allow"
    assets = session.exec(select(Asset)).all()
    return [a.dict() for a in assets]
