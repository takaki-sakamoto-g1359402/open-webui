"""フィードバックルーター."""

from fastapi import APIRouter, Depends
from sqlmodel import Session

from ..core.dependencies import get_current_user, get_db
from ..models import Feedback
from ..schemas.feedback import FeedbackCreate

router = APIRouter(prefix="/feedback", tags=["feedback"])


@router.post("/submit")
def submit(
    payload: FeedbackCreate,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    fb = Feedback(user_id=user.id, message=payload.message)
    db.add(fb)
    db.commit()
    return {"id": fb.id}
