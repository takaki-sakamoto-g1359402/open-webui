"""ゲートキーパールーター."""

from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from ..core.dependencies import get_current_user, get_db
from ..models import Invite

router = APIRouter(prefix="/gatekeeper", tags=["gatekeeper"])


@router.get("/enter")
def can_enter(
    room_id: str, user=Depends(get_current_user), db: Session = Depends(get_db)
):
    inv = db.exec(select(Invite).where(Invite.issuer_id == user.id)).first()
    allowed = (
        user.role == "MEMBER" and user.kyc_status == "VERIFIED" and inv is not None
    )
    return {"allowed": allowed}
