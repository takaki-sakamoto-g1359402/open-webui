from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from argon2 import PasswordHasher
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from realitybridge_core.config import get_settings
from realitybridge_core.domain.models import User

settings = get_settings()
password_hasher = PasswordHasher()


class AuthService:
    def hash_password(self, password: str) -> str:
        return password_hasher.hash(password)

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        try:
            return password_hasher.verify(hashed_password, plain_password)
        except Exception:
            return False

    def create_access_token(self, subject: str, role: str) -> str:
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
        payload: dict[str, Any] = {"sub": subject, "role": role, "exp": expires_at}
        return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)

    def authenticate(self, session: Session, email: str, password: str) -> User:
        user = session.execute(select(User).where(User.email == email)).scalar_one_or_none()
        if user is None or not self.verify_password(password, user.hashed_password):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
        return user

    def decode_token(self, token: str) -> dict[str, Any]:
        try:
            return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        except jwt.PyJWTError as exc:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc


auth_service = AuthService()
