"""アナウンスメントルーター."""

import json
from fastapi import APIRouter, Depends

from ..core.dependencies import get_current_user, get_db, require_role
from ..models import Announcement
from ..schemas.announcement import AnnouncementCreate
from ...modules.helpers import translate

router = APIRouter(prefix="/announcements", tags=["announcements"])


@router.post("/", dependencies=[Depends(require_role("ADMIN"))])
def create_announcement(
    payload: AnnouncementCreate,
    user=Depends(get_current_user),
    db: dict = Depends(get_db),
):
    translations = {}
    for lang in ["en", "ja", "es"]:
        translations[lang] = (
            payload.body
            if lang == payload.src_lang
            else translate(payload.body, payload.src_lang, lang)
        )
    ann = Announcement(
        author_id=user.id,
        title=payload.title,
        src_lang=payload.src_lang,
        translations=json.dumps(translations),
    )
    ann.id = len(db["announcements"]) + 1
    db["announcements"].append(ann)
    return {"id": ann.id}


@router.get("/")
def list_announcements(lang: str = "en", db: dict = Depends(get_db)):
    anns = db.get("announcements", [])
    result = []
    for a in anns:
        t = json.loads(a.translations)
        result.append({"title": a.title, "body": t.get(lang, t.get(a.src_lang))})
    return result
