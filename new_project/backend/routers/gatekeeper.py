"""ゲートキーパールーター."""

from fastapi import APIRouter, Depends

from ..core.dependencies import get_current_user, get_db

router = APIRouter(prefix="/gatekeeper", tags=["gatekeeper"])


@router.get("/enter")
def can_enter(room_id: str, user=Depends(get_current_user), db: dict = Depends(get_db)):
    inv_exists = any(inv.issuer_id == user.id for inv in db["invites"].values())
    allowed = (
        user["role"] == "MEMBER" and user["kyc_status"] == "VERIFIED" and inv_exists
    )
    return {"allowed": allowed}
