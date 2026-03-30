from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.schemas.auth import UserCreate, UserLogin, Token
from app.db.session import get_db
from app.services import auth_service
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=Token)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    stmt = select(User).where(User.email == user_in.email)
    existing = db.scalar(stmt)

    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = auth_service.create_user(db, email=user_in.email, password=user_in.password, full_name=user_in.full_name)
    token = auth_service.create_user_token(user)
    return {"access_token": token, "token_type": "bearer"}


@router.post("/login", response_model=Token)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    user = auth_service.authenticate_user(db, credentials.email, credentials.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = auth_service.create_user_token(user)
    return {"access_token": token, "token_type": "bearer"}