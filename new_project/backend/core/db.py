"""SQLModel データベース設定."""

from typing import Generator

from sqlmodel import SQLModel, Session, create_engine

from .config import settings

engine = create_engine(settings.DATABASE_URL, echo=False)


def init_db() -> None:
    """テーブルを自動生成する."""
    SQLModel.metadata.create_all(engine)


def get_session() -> Generator[Session, None, None]:
    """Session を提供する共通関数."""
    with Session(engine) as session:
        yield session
