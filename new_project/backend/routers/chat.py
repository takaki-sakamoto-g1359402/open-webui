"""チャット関連ルーター."""

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlmodel import Session, select

from ..core.dependencies import get_current_user, get_db
from ..models import Message
from ..schemas.message import MessageCreate

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/post")
def post_message(
    data: MessageCreate, user=Depends(get_current_user), db: Session = Depends(get_db)
):
    msg = Message(
        room_id=data.room_id, user_id=user.id, lang=data.lang, content=data.content
    )
    db.add(msg)
    db.commit()
    return {"status": "ok"}


@router.get("/stream")
def stream(room_id: str, db: Session = Depends(get_db)):
    def event_generator():
        last_id = 0
        while True:
            msgs = db.exec(
                select(Message).where(Message.room_id == room_id, Message.id > last_id)
            ).all()
            for m in msgs:
                last_id = m.id
                yield f"data: {m.user_id}: {m.content}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
