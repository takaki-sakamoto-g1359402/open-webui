"""SQLModel データベース設定."""
from sqlmodel import SQLModel, create_engine, Session
from .config import get_settings

settings = get_settings()
engine = create_engine(settings.database_url, echo=False)


def init_db() -> None:
    SQLModel.metadata.create_all(engine)


def get_session() -> Session:
    return Session(engine)
