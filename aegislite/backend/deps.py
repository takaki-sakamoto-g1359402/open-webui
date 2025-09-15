from fastapi import Depends, HTTPException, Request
from sqlmodel import Session, SQLModel, create_engine, select

from .auth.models import User

engine = create_engine("sqlite:///./aegislite.db")
SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session


def get_current_user(request: Request, session: Session = Depends(get_session)):
    username = request.headers.get("X-User")
    if not username:
        raise HTTPException(status_code=401, detail="Missing X-User header")
    user = session.exec(select(User).where(User.username == username)).first()
    if not user:
        raise HTTPException(status_code=401, detail="Unknown user")
    request.state.user = user.username
    return user
