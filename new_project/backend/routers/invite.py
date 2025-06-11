"""招待コードルーター."""

from fastapi import APIRouter, Depends, HTTPException

from ..core.dependencies import get_current_user, get_db, require_role
from ..models import Invite
from ..schemas.invite import InviteCreate, InviteRedeem
from ...modules.helpers import gen_uuid

router = APIRouter(prefix="/invites", tags=["invites"])


@router.post("/generate")
def generate_invite(
    data: InviteCreate,
    admin=Depends(require_role("ADMIN")),
    db: dict = Depends(get_db),
):
    code = gen_uuid()[:8]
    inv = Invite(code=code, issuer_id=admin.id, uses_left=data.max_uses)
    db["invites"][code] = inv
    return {"code": code}


@router.post("/redeem")
def redeem_invite(
    data: InviteRedeem,
    user=Depends(get_current_user),
    db: dict = Depends(get_db),
):
    inv = db["invites"].get(data.code)
    if not inv or inv.uses_left <= 0:
        raise HTTPException(status_code=400, detail="Invalid invite")
    inv.uses_left -= 1
    db["invites"][data.code] = inv
    return {"status": "redeemed"}
