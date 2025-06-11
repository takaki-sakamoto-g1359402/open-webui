"""API 共通依存関係."""

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from .security import verify_token
from .db import get_session


def get_db():
    yield from get_session()


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme), db: dict = Depends(get_db)
) -> dict:
    if token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated"
        )
    try:
        payload = verify_token(token)
        uid: str | None = payload.get("sub")
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token"
        ) from exc
    if not uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token"
        )
    user = db["users"].get(uid)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found"
        )
    return user


def require_role(role: str):
    def wrapper(user: dict = Depends(get_current_user)) -> dict:
        if user.get("role") != role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden"
            )
        return user

    return wrapper
