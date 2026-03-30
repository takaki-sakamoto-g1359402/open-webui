from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend import schemas
from backend.services.chat import ChatService
from backend.main import get_db

router = APIRouter()


@router.post("/chat/moderate", response_model=schemas.ModerateResponse)
def moderate(payload: schemas.ModerateRequest, db: Session = Depends(get_db)):
    service = ChatService(db)
    chat_log = service.moderate(payload.talent_id, payload.user_id, payload.message)
    return {"safe": chat_log.safe, "violation_category": chat_log.violation_category}


@router.post("/chat/reply", response_model=schemas.ChatReplyResponse)
def reply(payload: schemas.ModerateRequest, db: Session = Depends(get_db)):
    service = ChatService(db)
    chat_log = service.reply(payload.talent_id, payload.user_id, payload.message)
    return {
        "safe": chat_log.safe,
        "assistant_reply": chat_log.assistant_reply,
        "violation_category": chat_log.violation_category,
    }


@router.get("/chat/logs", response_model=schemas.PaginatedChatLogs)
def chat_logs(skip: int = 0, limit: int = 20, db: Session = Depends(get_db)):
    service = ChatService(db)
    logs, total = service.list_logs(skip, limit)
    return {"logs": logs, "total": total}
