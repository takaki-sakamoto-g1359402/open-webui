"""認証ルーター."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from ..core.dependencies import get_db
from ..core.security import create_access_token, get_password_hash, verify_password
from ..models import User
from ..schemas.user import Token, UserCreate, UserLogin
from ..modules.helpers import call_kyc_provider

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=Token)
def register(data: UserCreate, db: Session = Depends(get_db)):
    if db.exec(select(User).where(User.id == data.email)).first():
        raise HTTPException(status_code=400, detail="User already exists")
    user = User(
        id=data.email,
        email=data.email,
        hashed_password=get_password_hash(data.password),
        kyc_status=call_kyc_provider(data.id_document).value,
    )
    db.add(user)
    db.commit()
    token = create_access_token({"sub": user.id, "role": user.role})
    return Token(access_token=token)


@router.post("/login", response_model=Token)
def login(data: UserLogin, db: Session = Depends(get_db)):
    user = db.exec(select(User).where(User.id == data.email)).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
        )
    token = create_access_token({"sub": user.id, "role": user.role})
    return Token(access_token=token)
