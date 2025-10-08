from fastapi import APIRouter, Depends, Request
from sqlmodel import Session, select

from ..auth.models import AuditLog
from ..deps import get_session

router = APIRouter()


@router.get("/audit")
def read_audit(
    request: Request,
    limit: int = 10,
    session: Session = Depends(get_session),
):
    entries = session.exec(
        select(AuditLog).order_by(AuditLog.timestamp.desc()).limit(limit)
    ).all()
    request.state.decision = "allow"
    return [e.dict() for e in entries]
