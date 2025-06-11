"""KYC Webhook."""

import hmac
import hashlib
from fastapi import APIRouter, Header, HTTPException, Depends

from ..core.config import settings
from ..core.db import get_session

router = APIRouter(prefix="/webhook", tags=["webhook"])


@router.post("/kyc")
def kyc_webhook(
    payload: dict, signature: str = Header(""), db: dict = Depends(get_session)
):
    computed = hmac.new(
        settings.KYC_SECRET.encode(),
        msg=str(payload).encode(),
        digestmod=hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(computed, signature):
        raise HTTPException(status_code=400, detail="Invalid signature")
    uid = payload.get("uid")
    status = payload.get("status")
    user = db["users"].get(uid)
    if user:
        user.kyc_status = status
        if status == "VERIFIED":
            user.role = "MEMBER"
        db["users"][uid] = user
    return {"ok": True}
