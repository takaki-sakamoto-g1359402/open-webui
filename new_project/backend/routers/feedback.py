"""フィードバックルーター."""

from fastapi import APIRouter, Depends

from ..core.dependencies import get_current_user, get_db
from ..models import Feedback
from ..schemas.feedback import FeedbackCreate

router = APIRouter(prefix="/feedback", tags=["feedback"])


@router.post("/submit")
def submit(
    payload: FeedbackCreate,
    user=Depends(get_current_user),
    db: dict = Depends(get_db),
):
    fb = Feedback(user_id=user.id, message=payload.message)
    fb.id = len(db["feedback"].get(user.id, [])) + 1
    db.setdefault("feedback", {}).setdefault(user.id, []).append(fb)
    return {"id": fb.id}
