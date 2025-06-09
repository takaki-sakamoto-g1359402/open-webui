"""プロフィール API."""
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ..core.dependencies import get_current_user, get_db
from ..models import Profile
from ..schemas.user import ProfileUpdate

router = APIRouter(prefix="/profiles", tags=["profiles"])


@router.get("/{user_id}")
def get_profile(user_id: str, lang: str = "en", db: Session = Depends(get_db)):
    profile = db.exec(select(Profile).where(Profile.user_id == user_id)).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    data = json.loads(profile.data)
    text = data.get(lang) or next(iter(data.values()))
    return {"preferred_lang": profile.preferred_lang, "text": text}


@router.put("/{user_id}")
def update_profile(user_id: str, payload: ProfileUpdate, user=Depends(get_current_user), db: Session = Depends(get_db)):
    if user.id != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    profile = db.exec(select(Profile).where(Profile.user_id == user_id)).first()
    if not profile:
        profile = Profile(user_id=user_id, preferred_lang=payload.preferred_lang, data=json.dumps(payload.data))
    else:
        profile.preferred_lang = payload.preferred_lang
        profile.data = json.dumps(payload.data)
    db.add(profile)
    db.commit()
    return {"status": "saved"}
